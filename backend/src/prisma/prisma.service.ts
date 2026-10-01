import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Helper method to clean the database during automated tests.
   */
  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('cleanDatabase is not permitted in production!');
    }
    // Delete records in reverse dependency order
    await this.taskLabel.deleteMany({});
    await this.task.deleteMany({});
    await this.section.deleteMany({});
    await this.project.deleteMany({});
    await this.label.deleteMany({});
    await this.user.deleteMany({});
  }
}
