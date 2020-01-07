import { makeStyles } from '@material-ui/core/styles';

export const drawerWidth = 255;
export const locationDrawlerWidth = 384;

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    height: '100vh',
  },
  appBar: {
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    backgroundColor: theme.palette.primary.dark,
  },
  appBarShift: {
    width: `calc(100% - ${drawerWidth}px)`,
    marginLeft: drawerWidth,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  appBarWithLocationShift: {
    width: `calc(100% - ${locationDrawlerWidth}px)`,
    marginRight: locationDrawlerWidth,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  appBarBothShift: {
    width: `calc(100% - ${drawerWidth + locationDrawlerWidth}px)`,
    marginLeft: drawerWidth,
    marginRight: locationDrawlerWidth,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  locationContainer: {
    width: locationDrawlerWidth,
    overflow: 'auto',
    height: '100%',
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
  },
  tabPanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  tabs: { backgroundColor: theme.palette.primary.main },
  menuButton: { marginRight: theme.spacing(2) },
  hide: { display: 'none' },
  drawer: {
    width: drawerWidth,
    flexShrink: 0,
  },
  locationDrawer: {
    width: locationDrawlerWidth,
    flexShrink: 0,
  },
  drawerPaper: { width: drawerWidth },
  drawerLocationPaper: { width: locationDrawlerWidth },
  drawerHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(0, 1),
    ...theme.mixins.toolbar,
    justifyContent: 'space-between',
  },
  overflowAuto: { overflow: 'auto' },
  whiteBackground: { backgroundColor: 'rgb(255, 255, 255)' },
  content: {
    position: 'relative',
    flexGrow: 1,
    // padding: theme.spacing(3),
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: -drawerWidth,
  },
  contentShiftLocation: {
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginRight: locationDrawlerWidth,
  },
  contentShift: {
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginLeft: drawerWidth,
  },
}));

export default useStyles;
