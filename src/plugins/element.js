import Vue from "vue"
import { Button,Input,Table,TableColumn,Radio,RadioGroup,Checkbox,MessageBox } from "element-ui"

Vue.use(Button)
Vue.use(Input)
Vue.use(Table)
Vue.use(TableColumn)
Vue.use(Radio)
Vue.use(RadioGroup)
Vue.use(Checkbox)

Vue.prototype.$alert = MessageBox.alert
