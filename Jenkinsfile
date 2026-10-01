pipeline {
    agent any

    options {
        timeout(time: 1, unit: 'HOURS')
        buildDiscarder(logRotator(numToKeepStr: '30'))
        disableConcurrentBuilds()
        ansiColor('xterm')
    }

    environment {
        IMAGE_TAG           = "${env.GIT_COMMIT ? env.GIT_COMMIT.take(8) : env.BUILD_NUMBER}"
        NODE_ENV            = 'test'
        ENABLE_AWS_ECR_PUSH = 'false' // ₹0 Cost Safety Guard: False by default; set to 'true' only if deploying to AWS
        AWS_DEFAULT_REGION  = 'us-east-1'
    }


    stages {
        stage('Checkout') {
            steps {
                echo "Checking out branch: ${env.BRANCH_NAME ?: 'main'} (Commit: ${env.IMAGE_TAG})"
                checkout scm
            }
        }

        stage('Install Dependencies') {
            parallel {
                stage('Node Workspaces') {
                    steps {
                        echo "Installing Node.js monorepo dependencies deterministically..."
                        sh 'npm ci'
                    }
                }
                stage('Python AI Service') {
                    steps {
                        echo "Installing Python dependencies for AI Service..."
                        sh '''
                            python3 -m venv ai-service/.venv
                            ai-service/.venv/bin/pip install --upgrade pip
                            ai-service/.venv/bin/pip install -r ai-service/requirements.txt
                        '''
                    }
                }
            }
        }

        stage('Lint & Type-Check') {
            parallel {
                stage('Backend Lint & Typecheck') {
                    steps {
                        echo "Running Backend ESLint and TypeScript checks..."
                        sh 'npm run lint --workspace=backend'
                        sh 'npm run typecheck --workspace=backend'
                    }
                }
                stage('Frontend Lint & Typecheck') {
                    steps {
                        echo "Running Frontend ESLint and TypeScript checks..."
                        sh 'npm run lint --workspace=frontend'
                        sh 'npm run typecheck --workspace=frontend'
                    }
                }
            }
        }

        stage('Automated Tests') {
            parallel {
                stage('Backend Unit Tests') {
                    steps {
                        echo "Running NestJS backend unit tests..."
                        sh 'npm test --workspace=backend'
                    }
                }
                stage('AI Service Tests') {
                    steps {
                        echo "Running FastAPI AI service evaluation & unit tests..."
                        sh 'ai-service/.venv/bin/pytest ai-service/tests'
                    }
                }
            }
        }

        stage('Security & Dependency Scan') {
            steps {
                echo "Auditing npm package dependencies for known vulnerabilities..."
                sh 'npm audit --audit-level=high || true'
            }
        }

        stage('Docker Build') {
            parallel {
                stage('Build Frontend Image') {
                    steps {
                        echo "Building Next.js frontend container (Tag: ${env.IMAGE_TAG})..."
                        sh """
                            docker build \
                              -f frontend/Dockerfile \
                              -t todoist-frontend:${env.IMAGE_TAG} \
                              .
                        """
                    }
                }
                stage('Build Backend Image') {
                    steps {
                        echo "Building NestJS backend container (Tag: ${env.IMAGE_TAG})..."
                        sh """
                            docker build \
                              -f backend/Dockerfile \
                              -t todoist-backend:${env.IMAGE_TAG} \
                              .
                        """
                    }
                }
                stage('Build AI Service Image') {
                    steps {
                        echo "Building FastAPI AI service container (Tag: ${env.IMAGE_TAG})..."
                        sh """
                            docker build \
                              -f ai-service/Dockerfile \
                              -t todoist-ai:${env.IMAGE_TAG} \
                              ./ai-service
                        """
                    }
                }
            }
        }

        stage('ECR Push (Reference / Optional)') {
            when {
                allOf {
                    anyOf {
                        branch 'main'
                        branch 'develop'
                    }
                    expression { return env.ENABLE_AWS_ECR_PUSH == 'true' }
                }
            }
            steps {
                echo "Authenticating to AWS ECR and pushing immutable images..."
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'aws-ecr-deployer-credentials'
                ]]) {
                    sh """
                        aws ecr get-login-password --region ${AWS_DEFAULT_REGION} | \
                          docker login --username AWS --password-stdin ${env.ECR_REGISTRY}

                        docker tag todoist-frontend:${env.IMAGE_TAG} ${env.ECR_REGISTRY}/todoist-dev/frontend:${env.IMAGE_TAG}
                        docker tag todoist-backend:${env.IMAGE_TAG} ${env.ECR_REGISTRY}/todoist-dev/backend:${env.IMAGE_TAG}
                        docker tag todoist-ai:${env.IMAGE_TAG} ${env.ECR_REGISTRY}/todoist-dev/ai-service:${env.IMAGE_TAG}

                        docker push ${env.ECR_REGISTRY}/todoist-dev/frontend:${env.IMAGE_TAG}
                        docker push ${env.ECR_REGISTRY}/todoist-dev/backend:${env.IMAGE_TAG}
                        docker push ${env.ECR_REGISTRY}/todoist-dev/ai-service:${env.IMAGE_TAG}
                    """
                }
            }
        }

        stage('Staging Deployment (Prepared)') {
            when {
                branch 'develop'
            }
            steps {
                echo "Deployment to Staging EKS cluster prepared for upcoming deployment milestone."
                echo "Target Image Tags: ${env.IMAGE_TAG}"
            }
        }

        stage('Production Approval Gate') {
            when {
                branch 'main'
            }
            steps {
                timeout(time: 24, unit: 'HOURS') {
                    input message: "Approve deployment of release ${env.IMAGE_TAG} to Production?", ok: "Deploy to Production"
                }
            }
        }

        stage('Production Deployment (Prepared)') {
            when {
                branch 'main'
            }
            steps {
                echo "Deployment to Production EKS cluster prepared for upcoming deployment milestone."
                echo "Promoting immutable image tag ${env.IMAGE_TAG} to production."
            }
        }
    }

    post {
        always {
            echo "Pipeline run completed. Cleaning up workspace artifacts..."
            cleanWs deleteDirs: true, notFailBuild: true
        }
        success {
            echo "CI/CD Pipeline succeeded for release ${env.IMAGE_TAG}!"
        }
        failure {
            echo "CI/CD Pipeline failed! Check stage console logs for diagnostic details."
        }
    }
}
