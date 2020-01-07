// @flow
import React from 'react';
import Select from '@material-ui/core/Select';
import TextField from '@material-ui/core/TextField';
import MenuItem from '@material-ui/core/MenuItem';

import type { Source, MaterialInputElement } from 'reducer/dashboard';

type Props = {
  onChange: (value: string) => any,
  source: Source[],
  hasData: boolean,
  value: ?string,
};

const flex = { display: 'flex' };

const DeviceField = ({
  onChange, source, hasData, value,
}: Props) => {
  const entry = !!source && source.find((x: Source) => x.value === value);
  const text = !entry
    ? 'No device present'
    : entry.label;
  const handleChange = (e: MaterialInputElement) => onChange(e.target.value);
  return source.length > 1
    ? (
      <Select
        autoWidth
        style={flex}
        label='Device'
        onChange={handleChange}
        value={`${value || ''}`}
      >
        {source.map((x: Source) => (
          <MenuItem key={x.value} value={x.value}>
            {x.label}
          </MenuItem>
        ))}
      </Select>
    )
    : hasData
      ? <TextField fullWidth label='Device' disabled value={text} />
      : <TextField fullWidth label='Device' disabled value='Loading devices ...' />;
};

export default DeviceField;
