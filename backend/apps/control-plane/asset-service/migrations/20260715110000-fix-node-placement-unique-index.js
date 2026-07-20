module.exports = {
  async up(db) {
    const nodes = db.collection('nodes');

    await nodes.dropIndex('rackId_1_positionCode_1').catch(() => undefined);
    await nodes.createIndex(
      { rackId: 1, positionCode: 1 },
      {
        name: 'rackId_1_positionCode_1',
        unique: true,
        partialFilterExpression: {
          rackId: { $exists: true, $gt: '' },
          positionCode: { $exists: true, $gt: '' },
        },
      },
    );
  },

  async down(db) {
    const nodes = db.collection('nodes');

    await nodes.dropIndex('rackId_1_positionCode_1').catch(() => undefined);
    await nodes.createIndex(
      { rackId: 1, positionCode: 1 },
      {
        name: 'rackId_1_positionCode_1',
        unique: true,
        sparse: true,
      },
    );
  },
};
