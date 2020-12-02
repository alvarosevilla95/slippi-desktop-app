import _ from 'lodash';
import log from 'electron-log';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Button, Table, Icon } from 'semantic-ui-react';
import { stages as stageUtils } from '@slippi/slippi-js';
import classNames from 'classnames';

import styles from './FileRow.scss';
import SpacedGroup from './common/SpacedGroup';
import PlayerChiclet from './common/PlayerChiclet';
import * as timeUtils from '../utils/time';
import { getPlayerName } from '../utils/players'
import Tooltip from './common/Tooltip';

const path = require('path');
const shell = require('electron').shell;

export default class FileRow extends Component {
  static propTypes = {
    file: PropTypes.object.isRequired,
    fileIndex: PropTypes.number.isRequired,
    playFile: PropTypes.func.isRequired,
    setStatsGamePage: PropTypes.func.isRequired,
    setPlayerProfilePage: PropTypes.func.isRequired,
    onSelect: PropTypes.func.isRequired,
    selectedOrdinal: PropTypes.number.isRequired,
  };

  constructor(props) {
    super(props);

    const file = this.props.file || {};

    let isError = false;
    try {
      file.game.getSettings();
    } catch {
      isError = true;
    }

    // TODO: Improve error state UI but at least this doesn't crash the program
    this.state = {
      isError: isError,
    };
  }

  shouldComponentUpdate(nextProps) {
    return this.props.selectedOrdinal !== nextProps.selectedOrdinal;
  }

  playFile = (e) => {
    e.stopPropagation();
    const file = this.props.file || {};

    // Play the file
    this.props.playFile(file);
  };

  onSelect = () => {
    this.props.onSelect(this.props.file, this.props.fileIndex);
  };

  viewStats = (e) => {
    e.stopPropagation();
    this.props.setStatsGamePage(this.props.fileIndex);
  };

  viewPlayer = (e, player) => {
    e.stopPropagation();
    this.props.setPlayerProfilePage(player);
  };

  generateSelectCell() {
    const useOrdinal = this.props.selectedOrdinal > 0;
    let contents;
    if (useOrdinal) {
      contents = (
        <div>
          <Icon size="big" name="check square outline" />
          <div className={styles['pos-text']}>{this.props.selectedOrdinal}</div>
        </div>
      );
    } else {
      contents = (
        <Icon size="big" name="square outline" />
      );
    }

    const cellStyles = classNames({
      [styles['select-cell']]: true,
      [styles['selected']]: useOrdinal,
    });

    return (
      <Table.Cell className={cellStyles} verticalAlign="top" onClick={this.onSelect}>
        <div className={styles['select-content-wrapper']}>
          {contents}
        </div>
      </Table.Cell>
    );
  }

  generateDetailsCell() {
    const onFileLocationClick = () => {
      const fileLocation = path.resolve(this.props.file.fullPath);
      shell.showItemInFolder(fileLocation);
    }
    const metadata = [
      {
        label: 'Stage',
        content: this.getStageName(),
      },
      {
        separator: true,
      },
      {
        label: 'File',
        content:
          <Tooltip
            title="Open location">
            <button type="button" className={styles['reveal-file-location']} onClick={onFileLocationClick}>{this.getFileName()}</button>
          </Tooltip>,
      },
    ];

    const metadataDisplay = _.map(metadata, (entry, key) => {
      if (entry.separator) {
        return (
          <div key={`separator-${key}`} className={styles['separator']}>
            |
          </div>
        );
      }

      return (
        <div key={`metadata-${entry.label}`}>
          <span className={styles['label']}>{entry.label}</span>
          <span className={styles['value']}>{entry.content}</span>
        </div>
      );
    });

    return (
      <Table.Cell singleLine={true}>
        <SpacedGroup direction="vertical" size="xs">
          <SpacedGroup>{this.generateTeamElements()}</SpacedGroup>
          <SpacedGroup className={styles['metadata-display']} size="md">
            {metadataDisplay}
          </SpacedGroup>
        </SpacedGroup>
      </Table.Cell>
    );
  }

  getFileName() {
    const file = this.props.file || {};

    const fileName = file.fileName || '';
    const extension = path.extname(fileName);
    const nameWithoutExt = path.basename(fileName, extension);

    return nameWithoutExt;
  }

  getStageName() {
    if (this.state.isError) {
      return null;
    }

    const file = this.props.file || {};

    const settings = file.game.getSettings() || {};
    const stageId = settings.stageId;
    try {
      const stageName = stageUtils.getStageName(stageId);
      return stageName;
    } catch (err) {
      log.error(err);
      return "Unknown";
    }
  }

  generateTeamElements() {
    if (this.state.isError) {
      return <div />;
    }

    const file = this.props.file || {};
    const game = file.game || {};
    const settings = game.getSettings() || {};

    // If this is a teams game, group by teamId, otherwise group players individually
    const teams = _.chain(settings.players)
      .groupBy(player => (settings.isTeams ? player.teamId : player.port))
      .toArray()
      .value();

    // This is an ugly way to do this but the idea is to create spaced groups of
    // character icons when those characters are on a team and each team should
    // have an element indicating they are playing against each other in between
    const elements = [];
    teams.forEach((team, idx) => {
      // Add player chiclets for all the players on the team
      team.forEach(player => {
        const tag = getPlayerName(game, player.playerIndex)
        elements.push(
          <Link to="/player" key={`player-${player.playerIndex}`} className={styles['bound-link']} replace={false} onClick={e=> this.viewPlayer(e, tag)} >
            <PlayerChiclet
              game={game}
              playerIndex={player.playerIndex}
              showContainer={true}
            />
          </Link>
        );
      });

      // Add VS obj in between teams
      if (idx < teams.length - 1) {
        // If this is not the last team, add a "vs" element
        elements.push(
          <div className={styles['vs-element']} key={`vs-${idx}`}>
            {' '}
            vs{' '}
          </div>
        );
      }
    });

    return elements;
  }

  generateStartTimeCell() {
    if (this.state.isError) {
      return <Table.Cell singleLine={true}>Error</Table.Cell>;
    }

    const file = this.props.file || {};

    const startAtDisplay = timeUtils.monthDayHourFormat(file.startTime) || "Unknown";

    return <Table.Cell singleLine={true}>{startAtDisplay}</Table.Cell>;
  }

  generateOptionsCell() {
    return (
      <Table.Cell className={styles['actions-cell']} textAlign="center">
        <SpacedGroup direction="horizontal">
          <Button
            circular={true}
            inverted={true}
            size="tiny"
            basic={true}
            icon="play"
            onClick={this.playFile}
          />
          <Link to="/game" className={styles['bound-link']} replace={false}>
            <Button
              circular={true}
              inverted={true}
              size="tiny"
              basic={true}
              icon="bar chart"
              onClick={this.viewStats}
            />
          </Link>
        </SpacedGroup>

      </Table.Cell>
    );
  }

  render() {
    return (
      <Table.Row>
        {this.generateSelectCell()}
        {this.generateDetailsCell()}
        {this.generateStartTimeCell()}
        {this.generateOptionsCell()}
      </Table.Row>
    );
  }
}
