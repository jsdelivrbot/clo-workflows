import { IDataService } from "../../service"
import { action, observable, runInAction } from "mobx"
import { ClientStore, EmployeeStore, SessionStore } from ".."

export class RootStore {
    sessionStore: SessionStore
    clientStore: ClientStore // created for any ltt client (non-employee) user logged into the app
    employeeStore: EmployeeStore // created for employees logged into the app

    constructor(private dataService: IDataService) {}

    @observable public initialized: boolean = false

    @action
    async init(): Promise<void> {
        // only allow initialization if not previously initialized
        if (!this.initialized) {
            this.sessionStore = new SessionStore(this, this.dataService)

            // order of initializations matters - session store must be initialized first because other stores depend on user info
            await this.sessionStore.init()
            // create and initialize the employee store if the current user is an employee
            if (this.sessionStore.isEmployee) {
                this.employeeStore = new EmployeeStore(this, this.dataService)
                this.clientStore = new ClientStore(this, this.dataService)

                // init employee store since it will be displayed first, client store will be initialized if/when mode is switched
                await this.clientStore.init()
                await this.employeeStore.init()
            } else {
                this.clientStore = new ClientStore(this, this.dataService)
                await this.clientStore.init()
            }
            runInAction(() => (this.initialized = true))
        }
    }
}
