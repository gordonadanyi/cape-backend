import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  businessname: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  //   @Prop({
  //   type: {
  //   currentPassword: String,
  //   newPassword: String,
  //   confirmPassword: String,
  //   },
  //   default: {
  //     currentPassword: "",
  //   newPassword: "",
  //   confirmPassword: "",
  //   },
  // })
  // security: {
  //   currentPassword: string;
  //   newPassword: string;
  //   confirmPassword: string;

  // };
}

export const UserSchema = SchemaFactory.createForClass(User);
