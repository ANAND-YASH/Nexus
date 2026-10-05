import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import type { DocumentAnalysisResponse } from '@nexus/types';
import type { AuthenticatedUser } from '../../auth/auth.types';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { DocumentAnalysisService } from './document-analysis.service';

/** Authenticated by the global JwtAuthGuard; owner comes from the token. */
@Controller('documents')
export class DocumentAnalysisController {
  constructor(private readonly analysis: DocumentAnalysisService) {}

  /** 202: analysis runs asynchronously; poll GET …/analysis for the result. */
  @Post(':id/analyze')
  @HttpCode(HttpStatus.ACCEPTED)
  analyze(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DocumentAnalysisResponse> {
    return this.analysis.requestAnalysis(user.id, id);
  }

  @Get(':id/analysis')
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DocumentAnalysisResponse> {
    return this.analysis.getAnalysis(user.id, id);
  }
}
