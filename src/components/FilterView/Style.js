import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles(theme => ({
  cardsContainer: { padding: 5 },
  header: {},
  appBar: { backgroundColor: theme.palette.primary.dark },
  paddingRow: {
    marginTop: 10,
    // marginBottom: 10,
  },
  relative: { position: 'relative' },
  switch: {
    margin: 0,
    display: 'flex',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    padding: 0,
  },
}));

export default useStyles;
