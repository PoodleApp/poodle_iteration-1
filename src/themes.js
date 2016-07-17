import { getMuiTheme } from 'material-ui/styles'
import * as colors     from 'material-ui/styles/colors'
import { fade }        from 'material-ui/utils/colorManipulator'
import Spacing         from 'material-ui/styles/spacing'

export const PoodleTheme = getMuiTheme({
  spacing: Spacing,
  fontFamily: 'Roboto, sans-serif',
  palette: {
    primary1Color:      colors.brown500,
    primary2Color:      colors.brown700,
    primary3Color:      colors.brown100,
    accent1Color:       colors.lightBlueA400,
    accent2Color:       colors.lightBlueA700,
    accent3Color:       colors.lightBlueA200,
    textColor:          colors.darkBlack,
    alternateTextColor: colors.white,
    canvasColor:        colors.white,
    borderColor:        colors.grey300,
    disabledColor:      fade(colors.darkBlack, 0.3),
  }
})
