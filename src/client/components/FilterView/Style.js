import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles(theme => ({
  cardsContainer: {
    padding: 5,
  },
  header: {
    // backgroundColor: theme.palette.primary.dark,
    // color: theme.palette.primary.contrastText,
  },
  appBar: {
    backgroundColor: theme.palette.primary.dark,
  },
  relative: {
    position: 'relative',
  },
  switch: {
    margin: 0,
    display: 'flex',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    padding: 0,
  },
}));

export default useStyles;