import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { familyId } from './interviews.utils';

describe('familyId', () => {
  it("is an application's own id", () => {
    const id = new Types.ObjectId();

    expect(familyId({ _id: id })).toBe(id);
  });

  it("is an interview's application id", () => {
    const parent = new Types.ObjectId();

    expect(familyId({ _id: new Types.ObjectId(), parentSession: parent })).toBe(
      parent,
    );
  });
});
