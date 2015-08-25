import { Styles }       from 'material-ui'
import ColorManipulator from 'material-ui/lib/utils/color-manipulator'
import Light            from 'material-ui/lib/styles/themes/light-theme'

var { Colors } = Styles

var PoodleTheme = Object.assign({}, Light, {
  getPalette() {
    return {
      primary1Color: Colors.brown500,
      primary2Color: Colors.brown700,
      primary3Color: Colors.brown100,
      accent1Color: Colors.deepPurpleA200,
      accent2Color: Colors.deepPurpleA400,
      accent3Color: Colors.deepPurpleA100,
      textColor: Colors.darkBlack,
      canvasColor: Colors.white,
      borderColor: Colors.grey300,
      disabledColor: ColorManipulator.fade(Colors.darkBlack, 0.3),
    }
  }
})

export {
  PoodleTheme,
}
