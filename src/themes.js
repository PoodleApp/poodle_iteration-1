import Colors           from 'material-ui/lib/styles/colors'
import ColorManipulator from 'material-ui/lib/utils/color-manipulator'
import Spacing          from 'material-ui/lib/styles/spacing'

const PoodleTheme = {
  spacing: Spacing,
  fontFamily: 'Roboto, sans-serif',
  palette: {
    primary1Color: Colors.brown500,
    primary2Color: Colors.brown700,
    primary3Color: Colors.brown100,
    accent1Color: Colors.lightBlueA400,
    accent2Color: Colors.lightBlueA700,
    accent3Color: Colors.lightBlueA200,
    textColor: Colors.darkBlack,
    alternateTextColor: Colors.white,
    canvasColor: Colors.white,
    borderColor: Colors.grey300,
    disabledColor: ColorManipulator.fade(Colors.darkBlack, 0.3),
  }
}

export {
  PoodleTheme,
}
