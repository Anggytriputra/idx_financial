import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FinancialsService } from './financials.service';
import { CreateFinancialDto } from './dto/create-financial.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('financials')
@UseGuards(JwtAuthGuard)
export class FinancialsController {
  constructor(private readonly financialsService: FinancialsService) {}

  @Get('company/:companyId')
  findByCompany(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Request() req,
  ) {
    return this.financialsService.findByCompany(companyId, req.user.id);
  }

  @Get('company/:companyId/ratios')
  getRatios(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Request() req,
  ) {
    return this.financialsService.getRatios(companyId, req.user.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Request() req, @Body() dto: CreateFinancialDto) {
    return this.financialsService.create(req.user.id, dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Body() dto: Partial<CreateFinancialDto>,
  ) {
    return this.financialsService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.financialsService.remove(id, req.user.id);
  }
}
