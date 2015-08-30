import { Styles }       from 'material-ui'
import ColorManipulator from 'material-ui/lib/utils/color-manipulator'
import Light            from 'material-ui/lib/styles/themes/light-theme'
import objectAssign     from 'object-assign'

var { Colors } = Styles

var PoodleTheme = objectAssign({}, Light, {
  getPalette() {
    return {
      primary1Color: Colors.brown500,
      primary2Color: Colors.brown700,
      primary3Color: Colors.brown100,
      accent1Color: Colors.lightBlueA400,
      accent2Color: Colors.lightBlueA700,
      accent3Color: Colors.lightBlueA200,
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
