import * as React from "react"
import * as ReactDom from "react-dom"
import { useStrict } from "mobx"
import { App } from "./components/"
import { Provider } from "mobx-react"
import { RootStore } from "./store"
import { DataServiceFactory } from "./service"
import "./styles.scss"
// in strict mode, mobx requires that all observable data members only be modified through explicit @action mutators
useStrict(true)

const root = document.getElementById("root")
const rootStore = new RootStore(DataServiceFactory.getDataService())
window["rootStore"] = rootStore

const init = async () => {
    ReactDom.render(
        <Provider rootStore={rootStore}>
            <App />
        </Provider>,
        root
    )
    rootStore.init()
}

init()
