import { getCharacterIcon } from "@/lib/utils";
import { ConversionType } from "@slippi/slippi-js";
import { Game, getGamePlayerIndex, getPlayerName, GlobalStats } from "common/game";
import { convertFrameCountToDurationString } from "common/time";
import _ from "lodash";
import React from "react";
import * as T from "../ReplayFileStats/TableStyles";

const columnCount = 8;

export const ComboTable: React.FC<{ stats: GlobalStats }> = ({ stats }) => {
  const player = "";

  const generatePunishRow = (game: Game, punish: ConversionType) => {
    const start = convertFrameCountToDurationString(punish.startFrame);
    let end = "-";
    const damage = renderDamageCell(punish);
    const damageRange = renderDamageRangeCell(punish);
    const openingType = renderOpeningTypeCell(punish);

    if (punish.endFrame) {
      end = convertFrameCountToDurationString(punish.endFrame);
    }

    return (
      <T.TableRow key={`${game.filePath}-${punish.playerIndex}-punish-${punish.startFrame}`}>
        <T.TableCell>{getPlayerCard(game, false)}</T.TableCell>
        <T.TableCell>{getPlayerCard(game, true)}</T.TableCell>
        <T.TableCell>{openingType}</T.TableCell>
        <T.TableCell>{damage}</T.TableCell>
        <T.TableCell>{damageRange}</T.TableCell>
        <T.TableCell>{punish.moves.length}</T.TableCell>
        <T.TableCell>{start}</T.TableCell>
        <T.TableCell>{end}</T.TableCell>
      </T.TableRow>
    );
  };

  const getPlayerCard = (game: Game, isOpponent: boolean) => {
    let index = getGamePlayerIndex(game, player);
    if (isOpponent) index = 1 - index;
    const tag = getPlayerName(game, index);
    const players = game.getSettings().players || [];
    const playersByIndex = _.keyBy(players, "playerIndex");
    const p = playersByIndex[index];

    return (
      <div>
        <T.GrayableImage src={getCharacterIcon(p.characterId, p.characterColor)} height={24} width={24} />
        <div>{tag}</div>
      </div>
    );
  };

  const renderDamageCell = (punish: ConversionType) => {
    const difference = punish.currentPercent - punish.startPercent;

    let diffColor = "green";
    if (difference >= 70) {
      diffColor = "red";
    } else if (difference >= 35) {
      diffColor = "yellow";
    }

    const diffDisplay = `${Math.trunc(difference)}%`;

    return <div style={{ color: diffColor }}>{diffDisplay}</div>;
  };

  const renderDamageRangeCell = (punish: ConversionType) => {
    return <div>{`(${Math.trunc(punish.startPercent)}% - ${Math.trunc(punish.currentPercent)}%)`}</div>;
  };

  const renderOpeningTypeCell = (punish: ConversionType) => {
    const textTranslation = {
      "counter-attack": "Counter Hit",
      "neutral-win": "Neutral",
      trade: "Trade",
    };

    return <div>{textTranslation[punish.openingType]}</div>;
  };

  const renderHeaderTitle = () => {
    return (
      <T.TableRow>
        <T.TableHeaderCell colSpan={columnCount}>Top Punishes</T.TableHeaderCell>
      </T.TableRow>
    );
  };

  const renderHeaderColumns = () => {
    return (
      <T.TableRow>
        <T.TableHeaderCell>Player</T.TableHeaderCell>
        <T.TableHeaderCell>Opponent</T.TableHeaderCell>
        <T.TableHeaderCell>Opening</T.TableHeaderCell>
        <T.TableHeaderCell colSpan={2}>Damage</T.TableHeaderCell>
        <T.TableHeaderCell>Moves</T.TableHeaderCell>
        <T.TableHeaderCell>Start</T.TableHeaderCell>
        <T.TableHeaderCell>End</T.TableHeaderCell>
      </T.TableRow>
    );
  };

  const renderPunishRows = () => {
    return stats.punishes.slice(0, 19).map((punish) => generatePunishRow(punish.game, punish.punish));
  };

  return (
    <T.Table>
      {renderHeaderTitle()}
      {renderHeaderColumns()}
      {renderPunishRows()}
    </T.Table>
  );
};