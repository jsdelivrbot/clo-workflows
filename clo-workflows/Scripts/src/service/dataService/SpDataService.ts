import { IUser, User, IUserDto, CloRequestElement, IFormControl, IView, IRole, INote, NoteScope, NoteSource, IWork } from "../../model"
import { IDataService, ListName } from "./IDataService"
import * as pnp from "sp-pnp-js"
import { Web } from "sp-pnp-js/lib/sharepoint/webs"
import { getRole, getRoleNames } from "../../model/loader/resourceLoaders"
import { ODataDefaultParser, ItemAddResult } from "sp-pnp-js"
import * as DB_CONFIG from "../../../res/json/DB_CONFIG.json"
import { debug } from "util"
import { CLIENT_RENEG_LIMIT } from "tls"

// abstraction used to acess the SharePoint REST API
// should only be used when the app is deployed against a SharePoint Instance conforming to the schema defined in "res/json/DB_CONFIG.json"
export class SpDataService implements IDataService {
    constructor(appWebUrl: string, hostWebUrl: string) {
        this.APP_WEB_URL = appWebUrl
        this.HOST_WEB_URL = hostWebUrl
        this.cloRequestElementParser = new CloRequestElementParser()
    }

    /*******************************************************************************************************/
    // IDataService interface implementation
    /******************************************************************************************************/
    async fetchUser(): Promise<IUser> {
        const rawUser = await this.getAppWeb().currentUser.get()
        const rawSpGroups: any[] = await this.getAppWeb()
            .siteUsers.getById(rawUser.Id)
            .groups.get()
        const allRoleNames = getRoleNames()
        const spGroupNames: string[] = rawSpGroups.map(rawRole => rawRole.Title).filter(groupName => allRoleNames.includes(groupName))
        // if a user is part of the administrator group, that user receives every other role (besides anonymous)
        // TODO more generalizable way to make administrator have every role?
        const currentUserGroups: IRole[] = spGroupNames.includes("Administrator")
            ? /* if admin is one of their groups, add all roles */
              [...allRoleNames].map(roleName => getRole(roleName))
            : /* otherwise add all groups */
              [...spGroupNames, "Anonymous"].map(roleName => getRole(roleName))
        const userName = this.extractUsernameFromLoginName(rawUser.LoginName)
        return new User(
            rawUser.Title,
            userName,
            rawUser.Email,
            rawUser.UserId.NameId,
            currentUserGroups
            // [getRole("Anonymous")]
        )
    }
    // TODO add filter string to query for smaller requests and filtering on the backend
    async fetchEmployeeActiveProcesses(employee: User): Promise<Array<CloRequestElement>> {
        const activeProcesses: Array<CloRequestElement> = await this.getHostWeb()
            .lists.getByTitle(ListName.PROCESSES)
            .items.filter(this.ACTIVE_FILTER_STRING)
            .get(this.cloRequestElementParser)

        const permittedStepNames: string[] = []
        employee.roles.forEach(role => role.permittedSteps.forEach(step => permittedStepNames.push(step.name)))
        return activeProcesses.filter(item => {
            return permittedStepNames.includes(item.step as string)
        })
    }

    async fetchRequestElementsById(ids: number[], listName: ListName): Promise<CloRequestElement[]> {
        const projects: Array<CloRequestElement> = []
        const batch = this.getHostWeb().createBatch()
        for (const id of ids) {
            const project = await this.getHostWeb()
                .lists.getByTitle(listName)
                .items.getById(id)
                /*.inBatch(batch)*/ .get(this.cloRequestElementParser)
            projects.push(project)
        }
        // await batch.execute()
        return projects
    }

    async createRequestElement(requestElement: CloRequestElement, listName: ListName): Promise<CloRequestElement> {
        const result = await this.getHostWeb()
            .lists.getByTitle(listName)
            .items.add(requestElement)
        return result.data
    }

    async updateRequestElement(requestElement: CloRequestElement, listName: ListName): Promise<void> {
        await this.getHostWeb()
            .lists.getByTitle(listName)
            .items.getById(requestElement.Id as number)
            .update(requestElement)
    }

    async fetchClientActiveProjects(client: User): Promise<Array<CloRequestElement>> {
        const activeProjects: Array<CloRequestElement> = await this.getHostWeb()
            .lists.getByTitle(ListName.PROJECTS)
            .items.filter(this.ACTIVE_FILTER_STRING)
            .get(this.cloRequestElementParser)

        return activeProjects.filter(item => item.submitterId === client.name)
    }

    async fetchNotes(source: NoteSource, maxScope: NoteScope, sourceId: string, attachedClientId: string): Promise<INote[]> {
        let filterString: string
        if (source === NoteSource.PROJECT) {
            filterString = `projectId eq ${sourceId}`
        } else if (source === NoteSource.WORK) {
            filterString = `workId eq ${sourceId}`
        }

        if (maxScope === NoteScope.CLIENT) {
            filterString += ` and attachedClientId eq '${attachedClientId}'`
        } else if (maxScope === NoteScope.EMPLOYEE) {
            filterString += ` and (attachedClientId eq '${attachedClientId}' or scope eq '${NoteScope.EMPLOYEE}')`
        }

        return await this.getHostWeb()
            .lists.getByTitle(ListName.NOTES)
            .items.filter(filterString)
            .orderBy("Created", false /*ascending = false*/)
            .get(this.cloRequestElementParser)
    }

    async createNote(note: INote): Promise<ItemAddResult> {
        return await this.getHostWeb()
            .lists.getByTitle(ListName.NOTES)
            .items.add(note)
    }

    async updateNote(note: INote): Promise<void> {
        await this.getHostWeb()
            .lists.getByTitle(ListName.NOTES)
            .items.getById(Number(note.Id))
            .update(note)
    }
    async deleteNote(noteId: number): Promise<void> {
        await this.getHostWeb()
            .lists.getByTitle(ListName.NOTES)
            .items.getById(noteId)
            .delete()
    }

    async fetchClientProjects(submitterId: string): Promise<Array<CloRequestElement>> {
        return await this.getHostWeb()
            .lists.getByTitle(ListName.PROJECTS)
            .items.filter(`submitterId eq '${submitterId}'`)
            .orderBy("ID", true)
            .get(this.cloRequestElementParser)
    }
    async fetchClientProcesses(submitterId: string): Promise<Array<CloRequestElement>> {
        return await this.getHostWeb()
            .lists.getByTitle(ListName.PROCESSES)
            .items.filter(`submitterId eq '${submitterId}'`)
            .orderBy("projectId", true)
            .get(this.cloRequestElementParser)
    }
    async fetchWorks(): Promise<Array<IWork>> {
        return await this.getHostWeb()
            .lists.getByTitle(ListName.WORKS)
            .items.get(this.cloRequestElementParser)
    }
    async createProject(projectData: {}): Promise<ItemAddResult> {
        return await this.getHostWeb()
            .lists.getByTitle(ListName.PROJECTS)
            .items.add(projectData)
    }
    async searchProcessesByTitle(searchTerm: string): Promise<Array<CloRequestElement>> {
        return await this.getHostWeb()
            .lists.getByTitle(ListName.PROCESSES)
            .items.filter(`substringof('${searchTerm}',Title)`)
            .top(10)
            .get(this.cloRequestElementParser)
    }

    /* this sorting keps the process order lined up with project order this probably needs to be changed to something more stable longterm */
    async createProcess(process: {}): Promise<ItemAddResult> {
        return await this.getHostWeb()
            .lists.getByTitle(ListName.PROCESSES)
            .items.add(process)
    }
    async createWork(work: {}): Promise<ItemAddResult> {
        return await this.getHostWeb()
            .lists.getByTitle(ListName.WORKS)
            .items.add(work)
    }
    async fetchClientNotes(userId: string): Promise<Array<INote>> {
        return await this.getHostWeb()
            .lists.getByTitle(ListName.NOTES)
            .items.filter(`attachedClientId eq '${userId}'`)
            .get(this.cloRequestElementParser)
    }

    /******************************************************************************************************/
    // helper data and methods
    /******************************************************************************************************/
    private readonly ACTIVE_FILTER_STRING: string = "step ne 'complete'"
    private readonly HOST_WEB_URL: string
    private readonly APP_WEB_URL: string
    private readonly cloRequestElementParser: CloRequestElementParser

    private getAppWeb(): Web {
        return pnp.sp.configure(
            {
                headers: { Accept: "application/json; odata=verbose" },
                credentials: "same-origin",
            },
            "../"
        ).web
    }

    private getHostWeb(): Web {
        return pnp.sp
            .configure(
                {
                    headers: { Accept: "application/json; odata=verbose" },
                    credentials: "same-origin",
                },
                "../"
            )
            .crossDomainWeb(this.APP_WEB_URL, this.HOST_WEB_URL)
    }

    // the loginName string returned form the server contains some garbage appended to the username - take it out here
    private extractUsernameFromLoginName(loginName: string): string {
        if (loginName.includes("\\")) {
            return loginName.split("\\")[1]
        } else if (loginName.includes("|")) {
            return loginName.split("|")[1]
        } else return ""
    }
}

// This custom parser filters out irrelevant fields and metadata from SharePoint REST responses to WORK, PROCESS, PROJECT, and NOTE queries
// Only fields that are part of a CLO process, project, or request (as defined in res/DB_CONFIG.json) are preserved
export class CloRequestElementParser extends ODataDefaultParser {
    public constructor() {
        super()
        const tableNames = Object.keys(DB_CONFIG["tables"])
        this.cloFieldSet = tableNames.reduce((curFieldSet: Set<string>, tableName: string) => {
            const table = DB_CONFIG["tables"][tableName]
            table.fields.forEach((fieldName: string) => curFieldSet.add(fieldName))
            return curFieldSet
        }, new Set())
        this.cloFieldSet.add(DB_CONFIG["defaultFields"])
    }

    // set storing all fields specified in all tables of DB_CONFIG (as well as fields specified in DB_CONFIG.defaultFields)
    // a set is used because it prevents duplicates (there are many field duplicates among the various tables), and because it provides fast lookup
    private cloFieldSet: Set<string>

    // this method is called automatically by PNP once for each request
    public async parse(response: Response): Promise<any> {
        // the ODataDefaultParser base method returns a JSON with all fields for the given list - a mix of CLO fields and garbage SP metadata fields
        const parsedResponse = await super.parse(response)

        // the parsedResponse may be an array of response objects or a single object, depending on what was requested
        if (Array.isArray(parsedResponse)) {
            return parsedResponse.map((singleResponseObject: {}) => this.filterSpResponseObject(singleResponseObject))
        } else if (typeof parsedResponse === "object") {
            return this.filterSpResponseObject(parsedResponse)
        } else {
            console.log("custom SpDataParser was unable to handle the data type of the response")
            return parsedResponse
        }
    }

    // this method filters out all fields that are not defined in the cloFieldSet
    private filterSpResponseObject(spResponseObject: {}): {} {
        return Object.keys(spResponseObject).reduce((filteredResponseObject: {}, spReponseFieldName: string) => {
            if (this.cloFieldSet.has(spReponseFieldName)) {
                filteredResponseObject[spReponseFieldName] = spResponseObject[spReponseFieldName]
            }
            return filteredResponseObject
        }, {})
    }
}
