import mongoose from 'mongoose';

const apiKeySchema = new mongoose.Schema(
  {
    // Parent application & developer (denormalized for fast queries)
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      index: true
    },
    developerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Developer',
      required: true,
      index: true
    },

    // Human-readable label: "Production", "iOS App", "Staging" etc.
    keyLabel: {
      type: String,
      trim: true,
      default: 'Default'
    },

    // ── Public key ─────────────────────────────────────────────────────────────
    // Format: dds_pk_<32-char-base62>
    // Safe to expose in client-side code. Stored in plaintext.
    publicKey: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },

    // ── Secret key hashing ─────────────────────────────────────────────────────
    // Format: dds_sk_<32-char-base62>
    // Raw secret is NEVER stored. Two hashes for two lookup strategies:
    //
    //   secretSha256  — SHA-256 of the full raw secret.
    //                   Stored with a unique index → O(1) key resolution.
    //                   Industry standard for high-entropy API keys (Stripe, Clerk).
    //
    //   secretHash    — bcrypt hash (legacy, for keys generated before v2).
    //                   Select is false; only used in backwards-compat path.
    secretSha256: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      select: false  // Never returned in queries by default
    },
    secretHash: {
      type: String,
      select: false  // Legacy bcrypt hash — never returned
    },

    // Visible preview shown after first reveal closes.
    // e.g. "dds_sk_9M3Xx2wL...rSt"
    secretPreview: {
      type: String,
      required: true
    },

    // Scopes this key is authorized for
    scopes: {
      type: [String],
      enum: ['auth', 'verify', 'lookup', 'read', 'write', 'admin'],
      default: ['auth', 'verify']
    },

    status: {
      type: String,
      enum: ['active', 'disabled', 'revoked'],
      default: 'active',
      index: true
    },

    // Usage statistics (updated on each resolved request)
    requestCount: { type: Number, default: 0 },
    lastUsedAt:   { type: Date }
  },
  { timestamps: true }
);

const ApiKey = mongoose.model('ApiKey', apiKeySchema);
export default ApiKey;
