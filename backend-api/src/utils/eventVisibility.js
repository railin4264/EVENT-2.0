// Keep age clauses nested so date/category $or clauses cannot overwrite them.
function buildAgeRestrictionFilter(user) {
  const age = Number(user?.age) || 0;
  const clauses = [{ $or: [
    { 'ageRestriction.minAge': null },
    { 'ageRestriction.minAge': { $lte: age } }
  ] }, { $or: [
    { 'ageRestriction.maxAge': null },
    { 'ageRestriction.maxAge': { $lte: 0 } },
    ...(age > 0 ? [{ 'ageRestriction.maxAge': { $gte: age } }] : [])
  ] }];
  if (age < 18) clauses.push({ 'ageRestriction.isAdultOnly': { $ne: true } });
  return { $and: clauses };
}

function ageIsAllowed(event, user) {
  const age = Number(user?.age) || 0;
  const restriction = event.ageRestriction || {};
  return !(restriction.isAdultOnly && age < 18) &&
    !(restriction.minAge > 0 && age < restriction.minAge) &&
    !(restriction.maxAge > 0 && (!age || age > restriction.maxAge));
}

module.exports = { buildAgeRestrictionFilter, ageIsAllowed };
