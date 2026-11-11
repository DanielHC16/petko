import { Equals, IsBoolean } from 'class-validator'

export class AcceptTosDto {
  @IsBoolean()
  @Equals(true)
  tos_accepted!: true
}
