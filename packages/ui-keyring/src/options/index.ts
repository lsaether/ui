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

const sortByName = (a: SingleAddress, b: SingleAddress): number => {
  const valueA = a.option.name;
  const valueB = b.option.name;

  return valueA.localeCompare(valueB);
};

const sortByCreated = (a: SingleAddress, b: SingleAddress): number => {
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
  public readonly optionsSubject: BehaviorSubject<KeyringOptions> = new BehaviorSubject(this.emptyOptions());

  public createOptionHeader (name: string): KeyringSectionOption {
    return {
      className: 'header disabled',
      name,
      key: `header-${name.toLowerCase()}`,
      text: name,
      value: null
    };
  }

  public init (keyring: KeyringStruct): void {
    assert(!hasCalledInitOptions, 'Unable to initialise options more than once');

    observableAll.subscribe((): void => {
      const opts = this.emptyOptions();

      this.addAccounts(keyring, opts);
      this.addAddresses(keyring, opts);
      this.addContracts(keyring, opts);

      opts.address = this.linkItems({ Addresses: opts.address, Recent: opts.recent });
      opts.account = this.linkItems({ Accounts: opts.account, Development: opts.testing });
      opts.contract = this.linkItems({ Contracts: opts.contract });
      opts.all = ([] as KeyringSectionOptions).concat(opts.account, opts.address);
      opts.allPlus = ([] as KeyringSectionOptions).concat(opts.account, opts.address, opts.contract);

      this.optionsSubject.next(opts);
    });

    hasCalledInitOptions = true;
  }

  private linkItems (items: { [index: string]: KeyringSectionOptions }): KeyringSectionOptions {
    return Object.keys(items).reduce((result, header): KeyringSectionOptions => {
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
      .forEach(({ json: { meta: { isTesting = false } }, option }: SingleAddress): void => {
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
      .filter(({ json }: SingleAddress): boolean => !!json.meta.isRecent)
      .sort(sortByCreated)
      .forEach(({ option }: SingleAddress): void => {
        options.recent.push(option);
      });

    Object
      .values(available)
      .filter(({ json }: SingleAddress): boolean => !json.meta.isRecent)
      .sort(sortByName)
      .forEach(({ option }: SingleAddress): void => {
        options.address.push(option);
      });
  }

  private addContracts (keyring: KeyringStruct, options: KeyringOptions): void {
    const available = keyring.contracts.subject.getValue();

    Object
      .values(available)
      .sort(sortByName)
      .forEach(({ option }: SingleAddress): void => {
        options.contract.push(option);
      });
  }

  private emptyOptions (): KeyringOptions {
    return {
      account: [],
      address: [],
      contract: [],
      all: [],
      allPlus: [],
      recent: [],
      testing: []
    };
  }
}

const keyringOptionInstance = new KeyringOption();

export default keyringOptionInstance;
