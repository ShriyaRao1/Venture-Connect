const calculateMatchScore = (startup, investor) => {
  if (!investor || investor.role !== 'investor') return null;

  let score = 0;
  const prefs = investor.investorPreferences;

  // 1. Sector/Category Match (40 points)
  if (prefs?.sectors?.length > 0) {
    if (prefs.sectors.includes(startup.category)) {
      score += 40;
    }
  } else {
    const bioText = (investor.bio || '').toLowerCase();
    const catText = startup.category.toLowerCase();
    if (bioText.includes(catText) || (catText === 'ai/ml' && (bioText.includes('artificial') || bioText.includes('machine learning') || bioText.includes('ai') || bioText.includes('ml')))) {
      score += 40;
    } else {
      score += 25;
    }
  }

  // 2. Stage Match (35 points)
  if (prefs?.stages?.length > 0) {
    if (prefs.stages.includes(startup.stage)) {
      score += 35;
    }
  } else {
    score += 20;
  }

  // 3. Location Match (25 points)
  if (prefs?.locations?.length > 0) {
    if (prefs.locations.some(loc => loc.toLowerCase().trim() === startup.location.toLowerCase().trim())) {
      score += 25;
    }
  } else if (investor.location && startup.location) {
    const invLoc = investor.location.toLowerCase().split(',')[0].trim();
    const stLoc = startup.location.toLowerCase().split(',')[0].trim();
    if (invLoc === stLoc && invLoc.length > 0) {
      score += 25;
    } else {
      score += 15;
    }
  } else {
    score += 15;
  }

  return Math.min(Math.max(score, 60), 100);
};

module.exports = calculateMatchScore;
