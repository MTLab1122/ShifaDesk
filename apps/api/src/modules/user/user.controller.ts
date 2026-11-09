import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../common/auth/decorators';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';
import {
  UpdateUserProfileDto,
  updateUserProfileSchema,
} from '@matabai/validation';

@ApiTags('User Profiles')
@ApiBearerAuth('bearer-jwt')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Profile returned' })
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.userService.getMe(user);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateUserProfileDto,
  ) {
    const validated = updateUserProfileSchema.parse(body);
    return this.userService.updateMe(user, validated);
  }
}
