import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../common/auth/decorators';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';
import { AuthMeResponse, SessionValidationResponse } from '@matabai/shared';

@ApiTags('Authentication')
@ApiBearerAuth('bearer-jwt')
@UseGuards(JwtAuthGuard)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Get authenticated user session & profile',
    description: 'Returns profile details, organization memberships, and active tenant context.',
  })
  @ApiResponse({ status: 200, description: 'Profile returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@CurrentUser() user: AuthenticatedUser): Promise<AuthMeResponse> {
    return this.authService.getMe(user);
  }

  @Post('logout')
  @ApiOperation({
    summary: 'Logout current user session',
  })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.logout(user);
  }

  @Post('validate-session')
  @ApiOperation({
    summary: 'Validate active access token & session',
  })
  @ApiResponse({ status: 200, description: 'Session is valid' })
  validateSession(
    @CurrentUser() user: AuthenticatedUser,
  ): SessionValidationResponse {
    return this.authService.validateSession(user);
  }
}
