import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

// Better Auth owns writes to this collection. Mongoose strips undeclared
// paths on read, so every field Better Auth writes is declared here.
@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, type: String })
  name: string;

  @Prop({ required: true, type: String })
  email: string;

  @Prop({ required: true, type: Boolean })
  emailVerified: boolean;

  @Prop({ type: String })
  image?: string;

  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);
