import * as React from "react"
import { observer } from "mobx-react"
import { Dropdown, DefaultButton, PrimaryButton, PivotItem, PivotLinkFormat, PivotLinkSize, Pivot } from "office-ui-fabric-react/lib/"
import { Modal } from "office-ui-fabric-react/lib/components/Modal/Modal"
import { ClientStore } from "../../store/"
import { WorkForm, SearchList } from "../"
import "./styles.scss"

export interface IFormPanelProps {
    clientStore: ClientStore
}

export const ProcessFormModal = observer((props: IFormPanelProps) => {
    return (
        <Modal
            isOpen={true}
            onDismiss={() => {
                props.clientStore.view.modal = null
            }}
            isBlocking={true}
        >
            <div className="processFormModal-styles">
                <h2>Add a Work</h2>
                <Dropdown
                    selectedKey={props.clientStore.view.work.type || undefined}
                    options={props.clientStore.typesAsOptions.WORKS}
                    className={"workForm-dropDown-styles"}
                    placeHolder={props.clientStore.view.work.type || "select a Work type"}
                    onChanged={e => {
                        props.clientStore.view.work.type = e.text
                        props.clientStore.clearSearchResults()
                    }}
                />
                <Pivot
                    linkFormat={PivotLinkFormat.tabs}
                    linkSize={PivotLinkSize.normal}
                    onLinkClick={e => {
                        props.clientStore.view.work.isNew = e.props.itemKey === "new"
                        props.clientStore.clearSearchResults()
                    }}
                >
                    <PivotItem linkText="Existing Work" itemKey="existing">
                        <SearchList
                            items={props.clientStore.searchedWorkBriefs}
                            onSelectItem={e => {
                                props.clientStore.view.work.id = e.id.toString()
                            }}
                            typeSelected={props.clientStore.view.work.type ? true : false}
                            search={props.clientStore.search}
                            selectedItem={props.clientStore.view.work.id}
                            emptyMessage={""}
                        />
                    </PivotItem>
                    <PivotItem linkText="New Work" itemKey="new">
                        <WorkForm clientStore={props.clientStore} />
                    </PivotItem>
                </Pivot>

                <div className="process-buttonbar-styles">
                    <PrimaryButton
                        secondaryText="Submit Process Request"
                        onClick={props.clientStore.processClientRequest}
                        text="Submit Work Request"
                        disabled={
                            !props.clientStore.view.work.isNew && !!props.clientStore.view.work.id
                                ? false
                                : !props.clientStore.currentProcessFormIsValid
                        }
                    />
                    <DefaultButton
                        text="Close"
                        secondaryText="close without submitting"
                        onClick={props.clientStore.clearState}
                        disabled={props.clientStore.asyncPendingLockout}
                    />
                </div>
            </div>{" "}
        </Modal>
    )
})
