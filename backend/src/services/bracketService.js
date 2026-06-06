// Provides helper logic for building bracket rounds, scheduling bracket matches, and advancing winners.
const DEFAULT_MATCH_DURATION_MINUTES = 60;

export function createBracketError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function getRoundLabel(roundNumber, totalRounds) {
  if (roundNumber === totalRounds) return "Final";
  if (roundNumber === totalRounds - 1) return "Semi-final";
  if (roundNumber === totalRounds - 2) return "Quarter-final";
  return `Round ${roundNumber}`;
}

export function parseMatchDate(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
    const parsed = new Date(dateOnly ? `${trimmed}T00:00:00.000Z` : trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function parseMatchTime(value) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const normalized =
    typeof value === "string" && value.length === 5 ? `${value}:00` : value;
  const parsed = new Date(`1970-01-01T${normalized}Z`);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function getTotalRounds(tx, tournamentId) {
  const result = await tx.bracketmatches.aggregate({
    where: { turneu_id: tournamentId },
    _max: { round_number: true },
  });

  return result._max.round_number || 1;
}

function getDefaultMatchDate(bracketNode, tournament) {
  return (
    parseMatchDate(bracketNode.data_ndeshjes) ||
    parseMatchDate(tournament?.data_fillimit) ||
    parseMatchDate(new Date())
  );
}

function getDefaultDuration(tournament) {
  return (
    tournament?.sports?.kohezgjatja_default ??
    DEFAULT_MATCH_DURATION_MINUTES
  );
}

export async function ensureLinkedMatchForBracketNode(
  tx,
  bracketNode,
  tournament,
  totalRounds,
) {
  // A real match is only created once both bracket slots have teams.
  if (!bracketNode?.ekipi_shtepiak_id || !bracketNode?.ekipi_mysafir_id) {
    return null;
  }

  const resolvedTotalRounds =
    totalRounds || (await getTotalRounds(tx, bracketNode.turneu_id));
  const matchData = {
    turneu_id: bracketNode.turneu_id,
    ekipi_shtepiak_id: bracketNode.ekipi_shtepiak_id,
    ekipi_mysafir_id: bracketNode.ekipi_mysafir_id,
    data_ndeshjes: getDefaultMatchDate(bracketNode, tournament),
    ora_fillimit: parseMatchTime(bracketNode.ora_fillimit),
    fusha_id: bracketNode.fusha_id ?? null,
    statusi: "Planifikuar",
    faza: getRoundLabel(bracketNode.round_number, resolvedTotalRounds),
    kohezgjatja: getDefaultDuration(tournament),
  };

  if (bracketNode.ndeshja_id) {
    const existingMatch = await tx.matches.findUnique({
      where: { id: bracketNode.ndeshja_id },
      select: {
        id: true,
        matchresults: { select: { id: true } },
      },
    });

    if (!existingMatch) {
      const created = await tx.matches.create({ data: matchData });
      await tx.bracketmatches.update({
        where: { id: bracketNode.id },
        data: { ndeshja_id: created.id },
      });
      return created;
    }

    if (existingMatch.matchresults) {
      return existingMatch;
    }

    return tx.matches.update({
      where: { id: bracketNode.ndeshja_id },
      data: matchData,
    });
  }

  const created = await tx.matches.create({ data: matchData });
  await tx.bracketmatches.update({
    where: { id: bracketNode.id },
    data: { ndeshja_id: created.id },
  });

  return created;
}

function getSlotField(nextSlot) {
  if (nextSlot === "home") return "ekipi_shtepiak_id";
  if (nextSlot === "away") return "ekipi_mysafir_id";
  return null;
}

function determineBracketWinner(match, result) {
  // Bracket winners must be unambiguous because the next round needs one team.
  if (!match) {
    throw createBracketError(404, "Match not found.");
  }

  const homeTeamId = match.ekipi_shtepiak_id;
  const awayTeamId = match.ekipi_mysafir_id;
  const allowedWinners = [homeTeamId, awayTeamId];
  const selectedWinner = result.fitues_id ?? null;

  if (selectedWinner) {
    if (!allowedWinners.includes(selectedWinner)) {
      throw createBracketError(
        400,
        "Bracket match winner must be one of the participating teams.",
      );
    }

    return selectedWinner;
  }

  if (result.golat_shtepiak > result.golat_mysafir) {
    return homeTeamId;
  }

  if (result.golat_mysafir > result.golat_shtepiak) {
    return awayTeamId;
  }

  throw createBracketError(400, "Bracket matches cannot end in a draw.");
}

async function getTournamentForBracketNode(tx, tournamentId) {
  return tx.tournaments.findUnique({
    where: { id: tournamentId },
    include: {
      sports: {
        select: { kohezgjatja_default: true },
      },
    },
  });
}

async function getNextBracketNode(tx, bracketNode) {
  if (!bracketNode?.next_bracket_match_id) return null;

  return tx.bracketmatches.findUnique({
    where: { id: bracketNode.next_bracket_match_id },
    include: {
      matches: {
        select: {
          id: true,
          matchresults: { select: { id: true } },
        },
      },
    },
  });
}

function hasNodeProgress(node) {
  return Boolean(node?.fitues_id || node?.matches?.matchresults);
}

async function clearLinkedMatchIfIdle(tx, node) {
  if (!node?.ndeshja_id) return;

  if (node.matches?.matchresults) {
    throw createBracketError(
      400,
      "Cannot change this bracket because the downstream match already has a result.",
    );
  }

  await tx.bracketmatches.update({
    where: { id: node.id },
    data: { ndeshja_id: null },
  });
  await tx.matches.delete({ where: { id: node.ndeshja_id } });
}

export async function advanceBracketWinner(tx, bracketNode, winnerTeamId) {
  // Save the winner on this node, then copy that team into the configured next slot.
  await tx.bracketmatches.update({
    where: { id: bracketNode.id },
    data: { fitues_id: winnerTeamId },
  });

  const slotField = getSlotField(bracketNode.next_slot);
  if (!slotField || !bracketNode.next_bracket_match_id) {
    return;
  }

  const nextNode = await getNextBracketNode(tx, bracketNode);
  if (!nextNode) return;

  const currentSlotValue = nextNode[slotField];
  if (
    currentSlotValue &&
    currentSlotValue !== winnerTeamId &&
    hasNodeProgress(nextNode)
  ) {
    throw createBracketError(
      400,
      "Cannot change this winner because downstream bracket progress already exists.",
    );
  }

  const updatedNextNode = await tx.bracketmatches.update({
    where: { id: nextNode.id },
    data: { [slotField]: winnerTeamId },
  });

  const tournament = await getTournamentForBracketNode(
    tx,
    updatedNextNode.turneu_id,
  );
  const totalRounds = await getTotalRounds(tx, updatedNextNode.turneu_id);

  await ensureLinkedMatchForBracketNode(
    tx,
    { ...updatedNextNode, ndeshja_id: nextNode.ndeshja_id },
    tournament,
    totalRounds,
  );
}

async function clearDownstreamSlot(tx, bracketNode) {
  const slotField = getSlotField(bracketNode.next_slot);
  if (!slotField || !bracketNode.next_bracket_match_id) {
    return;
  }

  const nextNode = await getNextBracketNode(tx, bracketNode);
  if (!nextNode) return;

  if (hasNodeProgress(nextNode)) {
    throw createBracketError(
      400,
      "Cannot delete this result because downstream bracket progress already exists.",
    );
  }

  await clearLinkedMatchIfIdle(tx, nextNode);
  await tx.bracketmatches.update({
    where: { id: nextNode.id },
    data: { [slotField]: null },
  });
}

export async function applyBracketResultProgression(tx, matchId, result) {
  // Match results drive bracket movement, so finishing live matches advances the tree.
  const bracketNode = await tx.bracketmatches.findUnique({
    where: { ndeshja_id: matchId },
    include: {
      matches: {
        select: {
          id: true,
          ekipi_shtepiak_id: true,
          ekipi_mysafir_id: true,
        },
      },
    },
  });

  if (!bracketNode) {
    return { isBracketMatch: false, winnerTeamId: null };
  }

  const winnerTeamId = determineBracketWinner(bracketNode.matches, result);

  await tx.matchresults.update({
    where: { ndeshja_id: matchId },
    data: { fitues_id: winnerTeamId },
  });
  await tx.matches.update({
    where: { id: matchId },
    data: { statusi: "P\u00ebrfunduar" },
  });
  await advanceBracketWinner(tx, bracketNode, winnerTeamId);

  return { isBracketMatch: true, winnerTeamId };
}

export async function revertBracketResultProgression(tx, matchId) {
  const bracketNode = await tx.bracketmatches.findUnique({
    where: { ndeshja_id: matchId },
  });

  if (!bracketNode) {
    return { isBracketMatch: false };
  }

  await clearDownstreamSlot(tx, bracketNode);
  await tx.bracketmatches.update({
    where: { id: bracketNode.id },
    data: { fitues_id: null },
  });
  await tx.matches.update({
    where: { id: matchId },
    data: { statusi: "Planifikuar" },
  });

  return { isBracketMatch: true };
}
