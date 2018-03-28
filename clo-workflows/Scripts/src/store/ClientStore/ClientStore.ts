import { action, ObservableMap, observable, runInAction, computed } from "mobx"
import { autobind } from "core-decorators"
import { FormEntryType, CloRequestElement, PROJECT_TYPES, WORK_TYPES } from "../../model/CloRequestElement"
import { IFormControl } from "../../model/FormControl"
import { getView, getStep, getStepNames } from "../../model/loader/resourceLoaders"
import { IDataService } from "../../service/dataService/IDataService"
import { StoreUtils } from "./StoreUtils"
import { RootStore } from "../RootStore"
import { User, IUser } from "../../model/User"
import { getNextStepName, StepName } from "../../model/Step"
import { IProjectGroup } from "../../component/ProjectProcessList"
import { ClientViewState, ClientStoreData } from "./"
import { INote, NoteSource, NoteScope } from "../../model/Note"

type ClientObsMap = ObservableMap<FormEntryType>

export class ClientStore {
    @observable currentUser: IUser = this.root.sessionStore.currentUser
    /* Observable maps to store the info entered that is not state */
    @observable newProject: ClientObsMap
    @observable newProcess: ClientObsMap
    @observable newWork: ClientObsMap
    /* fetched data */
    @observable notes: Array<any>
    /* any message to be shown in the view */
    @observable message: any

    /* Object used to store all view related state */
    data: ClientStoreData = new ClientStoreData(this.dataService, this.currentUser)
    view: ClientViewState = new ClientViewState()
    utils: StoreUtils = new StoreUtils()

    constructor(private root: RootStore, private dataService: IDataService) {
        this.newProject = this.utils.getClientObsMap(this.currentUser.Id)
        this.newProcess = this.utils.getClientObsMap(this.currentUser.Id)
        this.newWork = this.utils.getClientObsMap(this.currentUser.Id)
    }

    @action
    async init(): Promise<void> {
        this.currentUser = this.root.sessionStore.currentUser
        await this.data.init()
    }

    /*********************************************************
     * Mutations to ClientViewState
     *********************************************************/

    /* function to update view state on this.view */
    /* this replaces the entire cirrent view with a new instance */
    @action
    clearState = () => {
        this.newProject = this.utils.getClientObsMap(this.currentUser.Id)
        this.newProcess = this.utils.getClientObsMap(this.currentUser.Id)
        this.newWork = this.utils.getClientObsMap(this.currentUser.Id)
        this.view.resetClientState()
    }

    @action
    postMessage(message: any, displayTime: number = 5000) {
        this.message = message
        setTimeout(
            action(() => {
                this.message = null
            }),
            displayTime
        )
    }

    /*********************************************************
     * Computed Values for view
     *********************************************************/
    @computed
    get currentForm(): Array<IFormControl> {
        return getView(this.view.workType || this.view.projectType).formControls
    }

    @computed
    get currentFormValidation(): {} {
        const typeToValidate = this.currentForm
        const newInstanceOfType = this.newWork || this.newProject
        return typeToValidate.reduce((accumulator: {}, formControl: IFormControl) => {
            const fieldName: string = formControl.dataRef
            const inputVal = newInstanceOfType.get(fieldName) || undefined
            const error: string = inputVal ? this.utils.validateFormControl(formControl, inputVal) : null
            accumulator[fieldName] = error
            return accumulator
        }, {})
    }

    @computed
    get clientProcesses() {
        return this.data.processes
            .map((proc, i) => {
                return {
                    key: proc.Id.toString(),
                    Id: proc.Id,
                    projectId: proc.projectId,
                    title: proc.Title,
                    step: `${proc.step} - ${getStep(proc.step as StepName).orderId} out of ${getStepNames().length}`,
                }
            })
            .sort((a, b) => Number(a.projectId) - Number(b.projectId))
    }

    @computed
    get clientProjects() {
        return this.data.projects
            .map((proj: CloRequestElement, i): IProjectGroup => ({
                key: proj.Id.toString(),
                projectId: proj.Id.toString(),
                Title: proj.Title.toString(),
                name: proj.Title.toString(),
                count: this.data.processes.filter(proc => proj.Id.toString() === proc.projectId).length,
                submitterId: proj.submitterId.toString(),
                startIndex: 0,
                isShowingAll: false,
            }))
            .map((e, i, a) => {
                i > 0 ? (e.startIndex = a[i - 1].count + a[i - 1].startIndex) : (e.startIndex = 0)
                return e
            })
    }

    @computed
    get typesAsOptions() {
        return {
            PROJECTS: PROJECT_TYPES.map(e => ({
                key: e,
                text: e,
            })),
            WORKS: WORK_TYPES.map(e => ({
                key: e,
                text: e,
            })),
        }
    }

    /*********************************************************
     * Other Class Actions
     *********************************************************/

    /* function to update class members of type ObservableMap */
    @action
    updateClientStoreMember = async (fieldName: string, newVal: FormEntryType | boolean, objToUpdate?: string) => {
        objToUpdate ? this[objToUpdate].set(fieldName, newVal) : (this[fieldName] = newVal)
    }
    /* determines which request the user is making from the ViewState */
    @action
    processClientRequest = async () => {
        this.view.projectType
            ? await this.submitProject()
            : this.view.workIsNew ? (await this.submitWork(), await this.submitProcess()) : await this.submitProcess()
        this.view.resetClientState()
    }

    @action
    handleAddNewProcess = (projectId: string) => {
        this.newProcess.set("projectId", projectId)
        this.view.showProcessModal = true
    }

    /*********************************************************
     * DataService Requests
     *********************************************************/

    /* POST's */

    @action
    private submitProject = async (): Promise<void> => {
        this.view.asyncPendingLockout = true
        this.newProject.set("type", this.view.projectType)
        try {
            const res = await this.dataService.createProject(this.newProject.toJS())
            this.newProject.set("Id", res.data.Id)
            runInAction(() => this.data.projects.push(this.newProject.toJS()))
            this.clearState()
            this.postMessage({ messageText: "project successfully created", messageType: "success" })
        } catch (error) {
            console.error(error)
            this.postMessage({ messageText: "there was a problem creating your new Project, try again", messageType: "error" })
        } finally {
            this.view.asyncPendingLockout = false
        }
    }

    @action
    private submitWork = async (): Promise<void> => {
        this.view.asyncPendingLockout = true
        try {
            this.newWork.set("type", this.view.workType)
            const res = await this.dataService.createWork(this.newWork.toJS())
            this.updateClientStoreMember("selectedWorkId", res.data.Id.toString())
        } catch (error) {
            console.error(error)
            this.postMessage({
                messageText: "there was a problem submitting your new Process request, try again",
                messageType: "error",
            })
        } finally {
            this.view.asyncPendingLockout = false
        }
    }

    @action
    private submitProcess = async (): Promise<void> => {
        this.view.asyncPendingLockout = true
        try {
            // processDetails.step = getNextStepName(processDetails, "Intake")
            this.newProcess.set("step", "Intake")
            this.view.workIsNew
                ? this.newProcess.set("Title", this.newWork.get("Title"))
                : this.newProcess.set("Title", this.data.works.find(work => work.Id.toString() === this.view.workId).Title)
            this.newProcess.set("workId", this.view.workId)
            const res = await this.dataService.createProcess(this.newProcess.toJS())
            this.newProcess.set("Id", res.data.Id)
            runInAction(() => this.data.processes.push(this.newProcess.toJS()))
            this.clearState()
            this.postMessage({
                messageText: "the new Process request was submitted successfully",
                messageType: "success",
            })
        } catch (error) {
            console.error(error)
            this.postMessage({
                messageText: "there was a problem submitting your new Process request, try again",
                messageType: "error",
            })
        } finally {
            this.view.asyncPendingLockout = false
        }
    }

    /*******************************************************************************************************/
    // NOTES - SHARED BY PROJECTS AND WORKS
    /*******************************************************************************************************/
    @action
    submitNewNote = async (noteToCreate: INote, noteSource: NoteSource): Promise<boolean> => {
        this.view.asyncPendingLockout = true

        let submissionStatus = true
        try {
            // fill in any info the new note needs before submission
            noteToCreate.dateSubmitted = this.utils.getFormattedDate()
            noteToCreate.submitter = this.root.sessionStore.currentUser.name
            if (noteToCreate.scope === NoteScope.CLIENT) {
                noteToCreate.attachedClientId = this.newProcess.get("submitterId") as string
            }

            if (noteSource === NoteSource.PROJECT) {
                noteToCreate.projectId = String(this.view.projectId)
            } else if (noteSource === NoteSource.WORK) {
                noteToCreate.workId = String(this.view.workId)
            }

            const addResult = await this.dataService.createNote(noteToCreate)
            noteToCreate.Id = addResult.data.Id // assign the assigned SP ID to the newly created note

            // if submission is successful, add the new note to the corresponding list
            if (noteSource === NoteSource.WORK) runInAction(() => this.notes.unshift(noteToCreate))
            if (noteSource === NoteSource.PROJECT) runInAction(() => this.notes.unshift(noteToCreate))
            this.postMessage({ messageText: "note successfully submitted", messageType: "success" })
        } catch (error) {
            console.error(error)
            submissionStatus = false
            this.postMessage({ messageText: "there was a problem submitting your note, try again", messageType: "error" })
        } finally {
            this.view.asyncPendingLockout = false
        }

        return submissionStatus
    }

    @action
    updateNote = async (noteToUpdate: INote, noteSource: NoteSource): Promise<boolean> => {
        this.view.asyncPendingLockout = true
        let submissionStatus = true
        try {
            noteToUpdate.dateSubmitted = this.utils.getFormattedDate()
            await this.dataService.updateNote(noteToUpdate)

            // if submission is successful, add the new note to the corresponding list
            if (noteSource === NoteSource.WORK) this.replaceElementInListById(noteToUpdate, this.notes)
            if (noteSource === NoteSource.PROJECT) this.replaceElementInListById(noteToUpdate, this.notes)

            this.postMessage({ messageText: "note successfully updated", messageType: "success" })
        } catch (error) {
            console.error(error)
            submissionStatus = false
            this.postMessage({ messageText: "there was a problem updating your note, try again", messageType: "error" })
        } finally {
            this.view.asyncPendingLockout = false
        }

        return submissionStatus
    }
    @action
    deleteNote = async (noteToDelete: INote, noteSource: NoteSource): Promise<boolean> => {
        this.view.asyncPendingLockout = true
        let submissionStatus = true

        try {
            await this.dataService.deleteNote(noteToDelete.Id)
            // if deletion is successful, remove the new note from the corresponding list
            if (noteSource === NoteSource.PROJECT) this.removeELementInListById(noteToDelete, this.notes)
            if (noteSource === NoteSource.WORK) this.removeELementInListById(noteToDelete, this.notes)
            this.postMessage({ messageText: "note successfully deleted", messageType: "success" })
        } catch (error) {
            console.error(error)
            submissionStatus = false
            this.postMessage({ messageText: "there was a problem deleting your note, try again", messageType: "error" })
        } finally {
            this.view.asyncPendingLockout = false
        }
        return submissionStatus
    }
    @action
    private replaceElementInListById = (newItem: CloRequestElement | INote, list: Array<CloRequestElement | INote>): boolean => {
        const staleItemIndex = list.findIndex(listItem => listItem["Id"] === newItem["Id"])

        if (staleItemIndex !== -1) {
            list[staleItemIndex] = newItem
            return true
        }
        return false
    }

    @action
    private removeELementInListById = (itemToDelete: CloRequestElement | INote, list: Array<CloRequestElement | INote>) => {
        list.splice(list.findIndex(listItem => listItem["Id"] === listItem["Id"]), 1 /*remove 1 elem*/)
    }
}