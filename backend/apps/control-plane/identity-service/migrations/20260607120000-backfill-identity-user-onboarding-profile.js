const MIGRATION_NAME = "20260607120000-backfill-identity-user-onboarding-profile";
const USERS_COLLECTION = "users";
const SNAPSHOT_COLLECTION = "migration_backfill_identity_user_onboarding_profile";

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function deriveFullName(user) {
  const username = normalizeString(user.username);
  const email = normalizeString(user.email);

  if (username) {
    return username;
  }

  if (email) {
    return email.split("@")[0];
  }

  return "Unknown User";
}

module.exports = {
  async up(db) {
    const usersCollection = db.collection(USERS_COLLECTION);
    const snapshotCollection = db.collection(SNAPSHOT_COLLECTION);
    const users = await usersCollection.find({}).toArray();

    if (users.length === 0) {
      return;
    }

    const snapshots = [];
    const updates = [];

    for (const user of users) {
      const set = {};
      const originalMissingFields = [];

      if (typeof user.fullName !== "string" || user.fullName.trim() === "") {
        set.fullName = deriveFullName(user);
        originalMissingFields.push("fullName");
      }

      if (typeof user.mustChangePassword !== "boolean") {
        set.mustChangePassword = false;
        originalMissingFields.push("mustChangePassword");
      }

      if (!Object.prototype.hasOwnProperty.call(user, "passwordChangedAt")) {
        set.passwordChangedAt = user.updatedAt || user.createdAt || null;
        originalMissingFields.push("passwordChangedAt");
      }

      if (!Object.prototype.hasOwnProperty.call(user, "lastLoginAt")) {
        set.lastLoginAt = null;
        originalMissingFields.push("lastLoginAt");
      }

      if (!Object.prototype.hasOwnProperty.call(user, "phoneNumber")) {
        set.phoneNumber = null;
        originalMissingFields.push("phoneNumber");
      }

      if (!Object.prototype.hasOwnProperty.call(user, "jobTitle")) {
        set.jobTitle = null;
        originalMissingFields.push("jobTitle");
      }

      if (!Object.prototype.hasOwnProperty.call(user, "department")) {
        set.department = null;
        originalMissingFields.push("department");
      }

      if (!Object.prototype.hasOwnProperty.call(user, "avatarUrl")) {
        set.avatarUrl = null;
        originalMissingFields.push("avatarUrl");
      }

      if (originalMissingFields.length === 0) {
        continue;
      }

      const nextUpdatedAt = new Date();
      set.updatedAt = nextUpdatedAt;

      snapshots.push({
        migration: MIGRATION_NAME,
        userId: user._id,
        originalMissingFields,
        originalUpdatedAt: user.updatedAt || null,
        createdAt: new Date(),
      });

      updates.push({
        updateOne: {
          filter: { _id: user._id },
          update: {
            $set: set,
          },
        },
      });
    }

    if (snapshots.length > 0) {
      await snapshotCollection.insertMany(snapshots, { ordered: false });
    }

    if (updates.length > 0) {
      await usersCollection.bulkWrite(updates, { ordered: false });
    }
  },

  async down(db) {
    const usersCollection = db.collection(USERS_COLLECTION);
    const snapshotCollection = db.collection(SNAPSHOT_COLLECTION);
    const snapshots = await snapshotCollection
      .find({ migration: MIGRATION_NAME })
      .toArray();

    if (snapshots.length === 0) {
      return;
    }

    const updates = snapshots.map((snapshot) => {
      const unset = {};

      for (const field of snapshot.originalMissingFields) {
        unset[field] = "";
      }

      const update = {
        $unset: unset,
      };

      if (snapshot.originalUpdatedAt) {
        update.$set = {
          updatedAt: snapshot.originalUpdatedAt,
        };
      }

      return {
        updateOne: {
          filter: { _id: snapshot.userId },
          update,
        },
      };
    });

    if (updates.length > 0) {
      await usersCollection.bulkWrite(updates, { ordered: false });
    }

    await snapshotCollection.deleteMany({ migration: MIGRATION_NAME });
  },
};
