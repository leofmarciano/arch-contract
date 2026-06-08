import { describe, expect, it } from 'vitest';

import { presetNames } from '../../src/config/presets/index.js';
import { errorsOf, ruleNames, runPreset } from '../helpers/preset.js';

const at = (p: string) => `/proj/${p}`;

describe('all presets — smoke (a trivial file produces no errors and never crashes)', () => {
  for (const name of presetNames()) {
    it(`${name} runs and passes a benign file`, () => {
      const v = runPreset(name, { [at('src/shared/util.ts')]: `export const noop = () => {};` });
      expect(errorsOf(v)).toEqual([]);
    });
  }
});

describe('clean-architecture', () => {
  const compliant: Record<string, string> = {
    [at('src/domain/entities/User.ts')]: `export class User {\n  constructor(public readonly id: string) {}\n}`,
    [at('src/application/ports/UserRepositoryPort.ts')]: `import type { User } from '../../domain/entities/User';\nexport interface UserRepositoryPort { save(u: User): Promise<void>; }`,
    [at('src/application/use-cases/CreateUserUseCase.ts')]: `import { User } from '../../domain/entities/User';\nimport type { UserRepositoryPort } from '../ports/UserRepositoryPort';\nexport class CreateUserUseCase {\n  constructor(private readonly repo: UserRepositoryPort) {}\n  async execute(id: string): Promise<User> { const u = new User(id); await this.repo.save(u); return u; }\n}`,
    [at('src/infrastructure/repositories/UserRepository.ts')]: `import type { User } from '../../domain/entities/User';\nimport type { UserRepositoryPort } from '../../application/ports/UserRepositoryPort';\nexport class UserRepository implements UserRepositoryPort { async save(_u: User): Promise<void> {} }`,
    [at('src/presentation/controllers/UserController.ts')]: `import { CreateUserUseCase } from '../../application/use-cases/CreateUserUseCase';\nexport class UserController {\n  constructor(private readonly uc: CreateUserUseCase) {}\n  create(id: string) { return this.uc.execute(id); }\n}`,
  };

  it('a compliant project has zero errors', () => {
    expect(errorsOf(runPreset('clean-architecture', compliant))).toEqual([]);
  });

  it('flags a framework import in the domain', () => {
    const v = runPreset('clean-architecture', {
      [at('src/domain/entities/Bad.ts')]: `import axios from 'axios';\nexport class Bad { x = axios; }`,
    });
    expect(ruleNames(v)).toContain('domain-is-framework-free');
  });

  it('flags domain importing infrastructure (layer-boundary)', () => {
    const v = runPreset('clean-architecture', {
      [at('src/domain/entities/Leaky.ts')]: `import { UserRepository } from '../../infrastructure/repositories/UserRepository';\nexport class Leaky { r = UserRepository; }`,
      [at('src/infrastructure/repositories/UserRepository.ts')]: `export class UserRepository {}`,
    });
    expect(ruleNames(v)).toContain('layer-boundary');
  });

  it('flags a use-case without execute()', () => {
    const v = runPreset('clean-architecture', {
      [at('src/application/use-cases/BadUseCase.ts')]: `export class BadUseCase { run() {} }`,
    });
    expect(ruleNames(v)).toContain('use-cases-are-classes-with-execute');
  });

  it('flags a controller instantiating a repository', () => {
    const v = runPreset('clean-architecture', {
      [at('src/presentation/controllers/BadController.ts')]: `export class BadController { make() { return new UserRepository(); } }`,
    });
    expect(ruleNames(v)).toContain('controllers-delegate-to-use-cases-not-repositories');
  });
});

describe('nest-js', () => {
  it('a compliant feature module has zero errors', () => {
    const v = runPreset('nest-js', {
      [at('src/users/users.module.ts')]: `import { Module } from '@nestjs/common';\n@Module({})\nexport class UsersModule {}`,
      [at('src/users/users.controller.ts')]: `import { Controller } from '@nestjs/common';\nimport { UsersService } from './users.service';\n@Controller('users')\nexport class UsersController { constructor(private readonly svc: UsersService) {} }`,
      [at('src/users/users.service.ts')]: `import { Injectable } from '@nestjs/common';\n@Injectable()\nexport class UsersService { findAll() { return []; } }`,
    });
    // decorators come from a stubbed import; the engine reads them syntactically.
    expect(errorsOf(v)).toEqual([]);
  });

  it('flags a controller missing @Controller', () => {
    const v = runPreset('nest-js', {
      [at('src/users/users.controller.ts')]: `export class UsersController {}`,
    });
    expect(ruleNames(v)).toContain('controllers-are-decorated-classes');
  });

  it('flags a controller that `new`s a service instead of using DI', () => {
    const v = runPreset('nest-js', {
      [at('src/users/users.controller.ts')]: `import { Controller } from '@nestjs/common';\nexport class UsersController { x() { return new UsersService(); } }`,
    });
    expect(ruleNames(v)).toContain('controllers-use-DI-not-new');
  });

  it('flags a deep cross-feature import (feature boundary)', () => {
    const v = runPreset('nest-js', {
      [at('src/orders/orders.service.ts')]: `import { Injectable } from '@nestjs/common';\nimport { UsersService } from '../users/users.service';\nexport class OrdersService { u = UsersService; }`,
      [at('src/users/users.service.ts')]: `import { Injectable } from '@nestjs/common';\nexport class UsersService {}`,
    });
    expect(ruleNames(v)).toContain('feature-modules-are-boundaries');
  });
});

describe('hexagonal', () => {
  it('flags a primary adapter importing a secondary adapter', () => {
    const v = runPreset('hexagonal', {
      [at('src/adapters/in/HttpController.ts')]: `import { DbRepo } from '../out/DbRepo';\nexport class HttpController { r = DbRepo; }`,
      [at('src/adapters/out/DbRepo.ts')]: `export class DbRepo {}`,
    });
    expect(ruleNames(v)).toContain('primary-adapters-do-not-import-secondary');
  });
});

describe('adonisjs', () => {
  it('flags a model that does not extend BaseModel', () => {
    const v = runPreset('adonisjs', {
      [at('app/models/user.ts')]: `export default class User {}`,
    });
    expect(ruleNames(v)).toContain('models-extend-basemodel');
  });

  it('flags a thick controller querying a model directly', () => {
    const v = runPreset('adonisjs', {
      [at('app/controllers/users_controller.ts')]: `import User from '../models/user';\nexport default class UsersController { async index() { return User; } }`,
      [at('app/models/user.ts')]: `import { BaseModel } from '@adonisjs/lucid/orm';\nexport default class User extends BaseModel {}`,
    });
    expect(ruleNames(v)).toContain('controllers-must-not-query-models-directly');
  });
});

describe('encore-ts', () => {
  it('flags an api handler instantiating a database inline', () => {
    const v = runPreset('encore-ts', {
      [at('users/api.ts')]: `export const create = () => { const db = new SQLDatabase('x'); return db; };`,
    });
    expect(ruleNames(v)).toContain('api-handlers-stay-thin-no-inline-infra');
  });

  it('flags a default export in an api file', () => {
    const v = runPreset('encore-ts', {
      [at('users/api.ts')]: `export default function handler() {}`,
    });
    expect(ruleNames(v)).toContain('api-files-have-no-default-export');
  });
});
