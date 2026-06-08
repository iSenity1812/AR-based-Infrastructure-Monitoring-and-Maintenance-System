import { AuthenticatedUserDto } from './authenticated-user.dto';

export interface CreateUserResultDto {
  user: AuthenticatedUserDto;
  temporaryPassword: string;
  mustChangePassword: boolean;
}
