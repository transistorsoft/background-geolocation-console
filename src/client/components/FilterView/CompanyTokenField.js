// @flow
import React from 'react';
import { Select, MenuItem } from '@material-ui/core';
import type { Source, MaterialInputElement } from '~/reducer/dashboard';

type Props = {
  onChange: (value: string) => any,
  source: Source[],
  value: ?string,
};

const CompanyTokenField = ({ onChange, source, value }: Props) => {
  return source.length > 1
    ? (
      <Select
        autoWidth
        style={{ display: 'flex' }}
        label={`Users (${source.length})`}
        onChange={({ target }: MaterialInputElement) => onChange(target.value)}
        value={value}
      >
        {source.map((x: Source) => (<MenuItem key={x.value} value={x.value}>{x.label}</MenuItem>))}
      </Select>
    )
    : null;
};

export default CompanyTokenField;
