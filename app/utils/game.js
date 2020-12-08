import _ from 'lodash';

import { stages } from '@slippi/slippi-js';

import { getPlayerName, getPlayerNamesByIndex } from './players'

export function getPlayerStocks(game, playerIndex) {
  const stocks = _.get(game.getStats(), 'stocks')
  return _.groupBy(stocks, 'playerIndex')[playerIndex] || []
}

export function getLastPlayerStock(game, playerIndex) {
  const playerStocks = getPlayerStocks(game, playerIndex)
  if (playerStocks.length === 0) {
    return {
      playerIndex: playerIndex,
      count: 4,
      endPercent: 0,
    }
  } 
  return _.orderBy(playerStocks, s => s.count)[0]
}

export function getGameWinner(game) {
  const lastStock0 = getLastPlayerStock(game, 0)
  const lastStock1 = getLastPlayerStock(game, 1)
  if (lastStock0.count > lastStock1.count) return 0
  if (lastStock0.count < lastStock1.count) return 1
  if (lastStock0.endPercent < lastStock1.endPercent) return 0
  if (lastStock0.endPercent > lastStock1.endPercent) return 1
  return -1
}

export function getGamePlayerIndex(game, playerTag) {
  const players = _.values(getPlayerNamesByIndex(game))
  if (players[0] === playerTag) return 0
  if (players[1] === playerTag) return 1
  return -1
}

export function getStageName(game) {
  const settings = game.getSettings() || {};
  const stageId = settings.stageId;
  try {
    return stages.getStageName(stageId);
  } catch (err) {
    console.log(stageId)
    console.log(err)
    return null;
  }
}

export function getPlayerCharacterCounts(games, playerTag, isOpponent) {
  let counts = games.map(game => {
    let index = getGamePlayerIndex(game, playerTag)
    if (isOpponent) {
      index = 1 - index
    }
    return {
      charId: _.get(game.getSettings().players, index).characterId,
      won: isOpponent ? index !== getGameWinner(game) : index === getGameWinner(game),
      player: getPlayerName(game, index),
    }
  }).reduce((a, x) => {
    const aggs = a // because es-lint can be dumb
    aggs[x.charId] = aggs[x.charId] || {count: 0, won: 0, players: []}
    aggs[x.charId].count += 1
    if (x.won) {
      aggs[x.charId].won += 1
    }
    if (!aggs[x.charId].players.includes(x.player)) {
      aggs[x.charId].players.push(x.player)
    }
    return aggs;
  }, {});

  counts =  _.map(counts, (value, key) => [key, value])
  counts =  _.sortBy(counts, v => -v[1].count)
  return counts
}

export function getOpponentsSummary(games, playerTag) {
  let aggs = games.map(game => {
    const index = 1 - getGamePlayerIndex(game, playerTag)
    return {
      name: getPlayerName(game, index),
      won: index !== getGameWinner(game),
      charId: _.get(game.getSettings().players, index).characterId,
    }
  }).reduce((a, x) => {
    const agg = a // because es-lint can be dumb
    agg[x.name] = agg[x.name] || {
      count: 0,
      won: 0,
      charIds: [],
    }
    agg[x.name].count += 1
    if (x.won) {
      agg[x.name].won += 1
    }
    if (!agg[x.name].charIds.includes(x.charId)) {
      agg[x.name].charIds.push(x.charId)
    }
    return agg;
  }, {});

  aggs = _.map(aggs, (value, key) => [key, value])
  aggs = _.sortBy(aggs, v => -v[1].count)
  return aggs;
}

export function getTopPunishes(games, playerTag) {
  const aggs = games.map(game => {
    const index = getGamePlayerIndex(game, playerTag)
    let punishes = game.getStats().conversions.filter(p => p.playerIndex === index)
    punishes = _.orderBy(punishes, x => -x.moves.length)
    return {
      game: game,
      punish: punishes[0] || null,
    }
  }).filter(x => x.punish !== null)

  return _.orderBy(aggs, x => -x.punish.moves.length)
}

export function getGlobalStats(games, playerTag) {
  const aggs =  games.reduce((a, game) => {
    const agg = a // because es-lint can be dumb
    const index = getGamePlayerIndex(game, playerTag)
    const opp = getPlayerName(game, 1-index)
    const stats = game.getStats()

    const pOverall = stats.overall[index]
    const oOverall = stats.overall[1-index]


    if (getGameWinner(game) === index) agg.wins += 1
    agg.opponents[opp] = agg.opponents[opp] || {
      count: 0,
      won: 0,
      charIds: [],
    }
    agg.opponents[opp].count += 1
    if (getGameWinner(game) === index) agg.opponents[opp].wins += 1
    if (!agg.opponents.includes(opp)) agg.opponents.push(_.get(game.getSettings().players, 1-index).characterId)

    agg.time += stats.lastFrame

    agg.kills += pOverall.killCount
    agg.deaths += oOverall.killCount
    agg.damageDone += pOverall.totalDamage
    agg.damageReceived += oOverall.totalDamage

    agg.conversionRateCount += pOverall.successfulConversions.count
    agg.conversionRateTotal += pOverall.successfulConversions.total
    agg.damagePerOpeningCount += pOverall.damagePerOpening.count
    agg.damagePerOpeningTotal += pOverall.damagePerOpening.total
    agg.openingsPerKillCount += pOverall.openingsPerKill.count
    agg.openingsPerKillTotal += pOverall.openingsPerKill.total
    agg.neutralWinRatioCount += pOverall.neutralWinRatio.count
    agg.neutralWinRatioTotal += pOverall.neutralWinRatio.total

    agg.inputsPerMinuteCount += pOverall.inputsPerMinute.count
    agg.inputsPerMinuteTotal += pOverall.inputsPerMinute.total
    agg.digitalInputsPerMinuteCount += pOverall.digitalInputsPerMinute.count
    agg.digitalInputsPerMinuteTotal += pOverall.digitalInputsPerMinute.total

    agg.punishes += stats.conversions.filter(p => p.playerIndex === index)
    return agg

  }, {
    count: games.length,
    wins: 0,
    opponents: [],
    time: 0,
    kills: 0,
    deaths: 0,
    damageDone: 0,
    damageReceived: 0,
    conversionRateCount: 0,
    conversionRateTotal: 0,
    openingsPerKillCount: 0,
    openingsPerKillTotal: 0,
    damagePerOpeningCount: 0,
    damagePerOpeningTotal: 0,
    neutralWinRatioCount: 0,
    neutralWinRatioTotal: 0,
    inputsPerMinuteCount: 0,
    inputsPerMinuteTotal: 0,
    digitalInputsPerMinuteCount: 0,
    digitalInputsPerMinuteTotal: 0,
    punishes: [],
  })

  console.log(aggs.punishes)

  return {
    ...aggs,
    conversionRate: aggs.conversionRateCount / aggs.conversionRateTotal,
    openingsPerKill: aggs.openingsPerKillCount / aggs.openingsPerKillTotal,
    damagePerOpening: aggs.damagePerOpeningCount / aggs.damagePerOpeningTotal,
    neutralWinRatio: aggs.neutralWinRatioCount / aggs.neutralWinRatioTotal,
    inputsPerMinute: aggs.inputsPerMinuteCount / aggs.inputsPerMinuteTotal,
    digitalInputsPerMinute: aggs.digitalInputsPerMinuteCount / aggs.digitalInputsPerMinuteTotal,
  }
}