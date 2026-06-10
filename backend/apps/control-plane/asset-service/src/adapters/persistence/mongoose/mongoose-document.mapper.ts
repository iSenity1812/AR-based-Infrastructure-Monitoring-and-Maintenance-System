type MongooseDocumentLike = { _id: { toString(): string } };

export function getDocumentId(document: MongooseDocumentLike): string {
  return document._id.toString();
}
