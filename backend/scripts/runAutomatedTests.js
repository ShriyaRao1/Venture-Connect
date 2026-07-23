const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const PORT = 5099;
process.env.PORT = PORT;
const BASE_URL = `http://localhost:${PORT}/api`;

// Helper for making JSON HTTP requests using native fetch
const request = async (method, urlPath, body = null, token = null) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = {
    method,
    headers,
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${urlPath}`, options);
  const data = await res.json();
  return { status: res.status, data };
};

const runTests = async () => {
  console.log('\n🚀 Starting Automated Integration Tests on Port', PORT);

  // 1. Boot Server
  const app = require('../server');
  // Wait a short moment for MongoDB connection
  await new Promise((r) => setTimeout(r, 2000));

  // Generate unique emails to avoid conflicts
  const suffix = Date.now();
  const investorEmail = `investor_${suffix}@test.com`;
  const founderEmail = `founder_${suffix}@test.com`;

  let investorToken = null;
  let founderToken = null;
  let investorId = null;
  let founderId = null;
  let startupId = null;
  let connectionId = null;

  try {
    // ──── TEST 1: Auth & User Types ────
    console.log('\n📝 Test 1: Registering users...');
    
    // Register Investor
    const regInv = await request('POST', '/auth/register', {
      name: 'Shriya Test Investor',
      email: investorEmail,
      password: 'password123',
      role: 'investor',
      investorType: 'Venture Capital (VC)',
      investorPreferences: { sectors: ['SaaS', 'AI/ML'], stages: ['Seed'], locations: ['Bengaluru'] }
    });
    if (regInv.status !== 201) throw new Error(`Investor registration failed: ${JSON.stringify(regInv.data)}`);
    investorToken = regInv.data.token;
    investorId = regInv.data.user._id;
    console.log('✅ Registered investor. Type:', regInv.data.user.investorType);

    // Register Founder
    const regFnd = await request('POST', '/auth/register', {
      name: 'Dev Test Founder',
      email: founderEmail,
      password: 'password123',
      role: 'founder'
    });
    if (regFnd.status !== 201) throw new Error(`Founder registration failed: ${JSON.stringify(regFnd.data)}`);
    founderToken = regFnd.data.token;
    founderId = regFnd.data.user._id;
    console.log('✅ Registered founder.');

    // ──── TEST 2: Startup Creation ────
    console.log('\n🚀 Test 2: Creating startup...');
    const createStartup = await request('POST', '/startups', {
      name: `SaaS Tech_${suffix}`,
      tagline: 'Automated testing tool startup',
      category: 'SaaS',
      stage: 'Early Traction',
      fundingGoal: 2000000,
      description: 'Test description content here.'
    }, founderToken);
    if (createStartup.status !== 201) throw new Error(`Startup creation failed: ${JSON.stringify(createStartup.data)}`);
    startupId = createStartup.data.startup._id;
    console.log(`✅ Created startup: "${createStartup.data.startup.name}"`);

    // ──── TEST 3: Connection Request & Range Validator (Max left blank) ────
    console.log('\n🤝 Test 3: Expressing interest (testing max-investment default fix)...');
    const expressInterest = await request('POST', '/connections', {
      startupId,
      message: 'Great startup, let us connect!',
      investmentRange: { min: 500000, max: 0 } // max left blank / 0
    }, investorToken);
    if (expressInterest.status !== 201) {
      throw new Error(`Expressing interest failed (range validator bug check): ${JSON.stringify(expressInterest.data)}`);
    }
    connectionId = expressInterest.data.connection._id;
    console.log('✅ Expressed interest successfully. status:', expressInterest.data.connection.status);

    // ──── TEST 4: Decline Connection ────
    console.log('\n❌ Test 4: Declining the connection request...');
    const declineRes = await request('PUT', `/connections/${connectionId}`, { status: 'rejected' }, founderToken);
    if (declineRes.status !== 200) throw new Error(`Declining connection failed: ${JSON.stringify(declineRes.data)}`);
    console.log('✅ Connection request rejected.');

    // ──── TEST 5: Connection Re-send / Reuse Logic ────
    console.log('\n🔄 Test 5: Re-expressing interest on rejected record (connection reuse check)...');
    const reuseRes = await request('POST', '/connections', {
      startupId,
      message: 'Re-submitting note with more details!',
      investmentRange: { min: 700000, max: 1500000 }
    }, investorToken);
    if (reuseRes.status !== 200) {
      throw new Error(`Connection reuse failed (E11000 duplicate error check): ${JSON.stringify(reuseRes.data)}`);
    }
    console.log(`✅ Connection reused and reset back to pending successfully! message updated: "${reuseRes.data.connection.message}"`);

    // Accept it now
    const acceptRes = await request('PUT', `/connections/${connectionId}`, { status: 'accepted' }, founderToken);
    if (acceptRes.status !== 200) throw new Error(`Accepting connection failed: ${JSON.stringify(acceptRes.data)}`);
    console.log('✅ Connection request accepted.');

    // ──── TEST 6: Round Creation & Investment Backer Populating ────
    console.log('\n💸 Test 6: Creating funding round and making investment...');
    const addRound = await request('POST', `/startups/${startupId}/rounds`, {
      roundName: 'Seed',
      targetAmount: 2000000,
      equityOffered: 10
    }, founderToken);
    if (addRound.status !== 201) throw new Error(`Creating round failed: ${JSON.stringify(addRound.data)}`);
    console.log('✅ Seed funding round created.');

    const investRes = await request('POST', `/startups/${startupId}/invest`, { amount: 500000 }, investorToken);
    if (investRes.status !== 200) throw new Error(`Investment failed: ${JSON.stringify(investRes.data)}`);
    console.log(`✅ Invested ₹5L. Round raisedAmount: ${investRes.data.startup.fundingRounds[1].raisedAmount}`);

    // Verify backers list is populated
    console.log('\n🔍 Test 7: Verifying startup details populate backing investor details...');
    const getStartupRes = await request('GET', `/startups/${startupId}`, null, founderToken);
    if (getStartupRes.status !== 200) throw new Error(`Failed to fetch startup details: ${JSON.stringify(getStartupRes.data)}`);
    
    const rounds = getStartupRes.data.startup.fundingRounds;
    const activeRound = rounds.find(r => r.status === 'Open') || rounds[rounds.length - 1];
    const investment = activeRound.investments[0];
    if (!investment.investor || typeof investment.investor !== 'object' || !investment.investor.name) {
      throw new Error(`Backing investor name was not populated! investment details: ${JSON.stringify(investment)}`);
    }
    console.log(`✅ Backer name successfully populated: "${investment.investor.name}"`);

    // ──── TEST 8: Verify connected users/startups are visible in public directories ────
    console.log('\n🔍 Test 8: Verifying connected entities remain visible in directory/browse searches...');
    
    // Founder queries investors list. Shriya (who is connected) should be returned.
    const getInvestorsRes = await request('GET', '/users/investors', null, founderToken);
    if (getInvestorsRes.status !== 200) throw new Error(`Failed to fetch investors list: ${JSON.stringify(getInvestorsRes.data)}`);
    const foundInvestor = getInvestorsRes.data.investors.find(inv => inv._id === investorId);
    if (!foundInvestor) {
      throw new Error('Connected investor was missing from the directory search results!');
    }
    console.log('✅ Connected investor remains visible in founder browse list.');

    // Investor queries startups list. Dev\'s startup (which is connected) should be returned.
    const getStartupsRes = await request('GET', '/startups', null, investorToken);
    if (getStartupsRes.status !== 200) throw new Error(`Failed to fetch startups list: ${JSON.stringify(getStartupsRes.data)}`);
    const foundStartup = getStartupsRes.data.startups.find(s => s._id === startupId);
    if (!foundStartup) {
      throw new Error('Connected startup was missing from the directory search results!');
    }
    console.log('✅ Connected startup remains visible in investor browse list.');

    // ──── CLEANUP ────
    console.log('\n🧹 Cleaning up test records...');
    const Connection = mongoose.model('Connection');
    const Startup = mongoose.model('Startup');
    const Message = mongoose.model('Message');
    const User = mongoose.model('User');

    await Promise.all([
      User.findByIdAndDelete(investorId),
      User.findByIdAndDelete(founderId),
      Startup.findByIdAndDelete(startupId),
      Connection.findByIdAndDelete(connectionId),
    ]);
    console.log('✅ Test records cleaned up successfully.');

    console.log('\n✨ ALL TESTS COMPLETED SUCCESSFULLY! 🎉');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ TEST SUITE RUNTIME ERROR:', error.message);
    
    // Attempt cleanup in case of crash
    try {
      const Connection = mongoose.model('Connection');
      const Startup = mongoose.model('Startup');
      const User = mongoose.model('User');
      if (investorId) await User.findByIdAndDelete(investorId);
      if (founderId) await User.findByIdAndDelete(founderId);
      if (startupId) await Startup.findByIdAndDelete(startupId);
      if (connectionId) await Connection.findByIdAndDelete(connectionId);
    } catch (_) {}

    process.exit(1);
  }
};

runTests();
