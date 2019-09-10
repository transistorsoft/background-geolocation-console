// @flow
import React from 'react';
import Select from '@material-ui/core/Select';

type Props = {
  onChange: (value: string) => any,
  source: { value: string, label: string }[],
  value: ?string,
};

const CompanyTokenField = ({ onChange, source, value }: Props) => {
  return source.length > 1
    ? <Select autoWidth label={`Users (${source.length})`} onChange={onChange} value={value}>
      {source.map(x => (<MenuItem key={x.value} value={x.valur}>{x.label}</MenuItem>))}
      </Select>
    : null;
};

export default CompanyTokenField;
