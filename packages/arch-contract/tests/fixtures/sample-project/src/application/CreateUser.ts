import { User } from '../domain/User';

export class CreateUser {
  run(id: string): User {
    return new User(id);
  }
}
