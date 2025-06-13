import mongoose from "mongoose";

const SubscriptionSchema = new mongoose.Schema(
  {
    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      trim: true,
    },
    subscriber: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        trim: true,
      },
    ],
  },
  { timestamps: true }
);

export const Subscription = mongoose.model("Subscription", SubscriptionSchema);
