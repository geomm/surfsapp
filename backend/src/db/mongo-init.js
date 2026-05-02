// Runs inside the MongoDB container via /docker-entrypoint-initdb.d/
// Creates required empty collections if they don't already exist (idempotent)

db = db.getSiblingDB('surfsapp');

const collections = ['beaches', 'forecastsnapshots', 'settings'];

collections.forEach(function (name) {
  if (!db.getCollectionNames().includes(name)) {
    db.createCollection(name);
    print('Created collection: ' + name);
  } else {
    print('Collection already exists, skipping: ' + name);
  }
});
