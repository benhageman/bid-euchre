import { IsString, IsNotEmpty, IsIn, IsNumber, IsOptional } from 'class-validator';
import { Trump, BidAmount } from '../types';

export class HostRoomDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  room: string;
}

export class JoinRoomDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  room: string;
}

export class MakeBidDto {
  @IsNotEmpty()
  amount: BidAmount;

  @IsIn(['high', 'low', 'hearts', 'diamonds', 'clubs', 'spades'])
  trump: Trump;

  @IsString()
  @IsNotEmpty()
  room: string;
}

export class PlayCardDto {
  @IsString()
  @IsNotEmpty()
  card: string;

  @IsString()
  @IsNotEmpty()
  room: string;
}

export class AddBotDto {
  @IsString()
  @IsNotEmpty()
  room: string;
}
