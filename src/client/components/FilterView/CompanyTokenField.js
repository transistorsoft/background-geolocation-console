// @flow
import React from 'react';
import { Dropdown } from 'react-toolbox/lib/dropdown';

type Props = {
  onChange: (value: string) => any,
  source: { value: string, label: string }[],
  value: ?string,
};

const CompanyTokenField = ({ onChange, source, value }: Props) => {
  return source.length > 1
    ? <Dropdown auto label={`Users (${source.length})`} onChange={onChange} source={source} value={value} />
    : null;
};

export default CompanyTokenField;
