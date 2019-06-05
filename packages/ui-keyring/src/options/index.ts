// Copyright 2017-2019 @polkadot/ui-keyring authors & contributors
// This software may be modified and distributed under the terms
// of the Apache-2.0 license. See the LICENSE file for details.

import { KeyringStruct } from '../types';
import { SingleAddress } from '../observable/types';
import { KeyringOptions, KeyringOptionInstance, KeyringSectionOption, KeyringSectionOptions } from './types';

import { BehaviorSubject } from 'rxjs';
import { assert } from '@polkadot/util';

import observableAll from '../observable';

let hasCalledInitOptions = false;

const sortByName = (a: SingleAddress, b: SingleAddress) => {
  const valueA = a.option.name;
  const valueB = b.option.name;

  return valueA.localeCompare(valueB);
};

const sortByCreated = (a: SingleAddress, b: SingleAddress) => {
  const valueA = a.json.meta.whenCreated || 0;
  const valueB = b.json.meta.whenCreated || 0;

  if (valueA < valueB) {
    return 1;
  }

  if (valueA > valueB) {
    return -1;
  }

  return 0;
};

class KeyringOption implements KeyringOptionInstance {
  optionsSubject: BehaviorSubject<KeyringOptions> = new BehaviorSubject(this.emptyOptions());

  createOptionHeader (name: string): KeyringSectionOption {
    return {
      className: 'header disabled',
      name,
      key: `header-${name.toLowerCase()}`,
      text: name,
      value: null
    };
  }

  init (keyring: KeyringStruct): void {
    assert(!hasCalledInitOptions, 'Unable to initialise options more than once');

    observableAll({
      genesisHash: keyring.genesisHash
    }).subscribe(() => {
      const options = this.emptyOptions();

      this.addAccounts(keyring, options);
      this.addAddresses(keyring, options);
      this.addContracts(keyring, options);

      options.address = this.linkItems({
        'Addresses': options.address,
        'Recent': options.recent
      });
      options.account = this.linkItems({
        'Accounts': options.account,
        'Development': options.testing
      });
      options.contract = this.linkItems({
        'Contracts': options.contract
      });

      options.all = ([] as KeyringSectionOptions).concat(
        options.account,
        options.address
      );

      options.allPlus = ([] as KeyringSectionOptions).concat(
        options.account,
        options.address,
        options.contract
      );

      this.optionsSubject.next(options);

      console.log(this.optionsSubject.getValue());
    });

    hasCalledInitOptions = true;
  }

  private linkItems (items: { [index: string]: KeyringSectionOptions }) {
    return Object.keys(items).reduce((result, header) => {
      const options = items[header];

      return result.concat(
        options.length
          ? [this.createOptionHeader(header)]
          : [],
        options
      );
    }, [] as KeyringSectionOptions);
  }

  private addAccounts (keyring: KeyringStruct, options: KeyringOptions): void {
    const available = keyring.accounts.subject.getValue();

    Object
      .values(available)
      .sort(sortByName)
      .forEach(({ json: { meta: { isTesting = false } }, option }: SingleAddress) => {
        if (!isTesting) {
          options.account.push(option);
        } else {
          options.testing.push(option);
        }
      });
  }

  private addAddresses (keyring: KeyringStruct, options: KeyringOptions): void {
    const available = keyring.addresses.subject.getValue();

    Object
      .values(available)
      .filter(({ json }: SingleAddress) => {
        return json.meta.isRecent;
      })
      .sort(sortByCreated)
      .forEach(({ option }: SingleAddress) => {
        options.recent.push(option);
      });

    Object
      .values(available)
      .filter(({ json }: SingleAddress) => {
        return !json.meta.isRecent;
      })
      .sort(sortByName)
      .forEach(({ option }: SingleAddress) => {
        options.address.push(option);
      });
  }

  private addContracts (keyring: KeyringStruct, options: KeyringOptions): void {
    const available = keyring.contracts.subject.getValue();

    Object
      .values(available)
      .sort(sortByName)
      .forEach(({ option }: SingleAddress) => {
        options.contract.push(option);
      });
  }

  private emptyOptions (): KeyringOptions {
    return {
      account: [],
      address: [],
      all: [],
      allPlus: [],
      contract: [],
      recent: [],
      testing: []
    };
  }
}

const keyringOptionInstance = new KeyringOption();

export default keyringOptionInstance;
