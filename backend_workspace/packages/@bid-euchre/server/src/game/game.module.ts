import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { GameService } from './services/game.service';
import { GameStateService } from './services/game-state.service';
import { BotService } from './services/bot.service';

@Module({
  providers: [GameGateway, GameService, GameStateService, BotService],
  exports: [GameService, GameStateService, BotService],
})
export class GameModule {}
