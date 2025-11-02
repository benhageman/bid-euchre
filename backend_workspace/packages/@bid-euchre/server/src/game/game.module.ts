import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { GameService } from './services/game.service';
import { GameStateService } from './services/game-state.service';
import { BotService } from './services/bot.service';
import { ValidationService } from './services/validation.service';

@Module({
  providers: [GameGateway, GameService, GameStateService, BotService, ValidationService],
  exports: [GameService, GameStateService, BotService, ValidationService],
})
export class GameModule {}
