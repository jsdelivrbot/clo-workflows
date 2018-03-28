import { observer } from "mobx-react"
import { Dropdown, Checkbox } from "office-ui-fabric-react"
import { DefaultButton, PrimaryButton } from "office-ui-fabric-react/lib/Button"
import { Panel, PanelType } from "office-ui-fabric-react/lib/Panel"
import { Modal } from "office-ui-fabric-react/lib/Modal"
import * as React from "react"

import { ClientStore } from "../store/ClientStore/ClientStore"
import FormControlGroup from "./FormControlGroup"
import WorkFormModal from "./WorkFormModal"

export interface IFormPanelProps {
    clientStore: ClientStore
}

const ProcessFormModal = observer((props: IFormPanelProps) => {
    return (
        <Modal
            isOpen={props.clientStore.view.showProcessModal === true}
            onDismiss={() => {
                props.clientStore.view.showProcessModal = false
            }}
            isBlocking={true}
        >
            <div
                style={{
                    height: "80vh",
                    width: "40vw",
                    padding: "32px",
                }}
            >
                <h2>New Process Form</h2>
                <Checkbox
                    label={"add a new work"}
                    checked={props.clientStore.view.workIsNew}
                    onChange={(m, v) => {
                        v
                            ? (props.clientStore.view.workIsNew = v)
                            : ((props.clientStore.view.workIsNew = v), (props.clientStore.view.workType = ""))
                    }}
                />
                {props.clientStore.view.workIsNew ? (
                    <WorkFormModal clientStore={props.clientStore} />
                ) : (
                    <Dropdown
                        label="Select the Work:"
                        selectedKey={props.clientStore.view.workType ? props.clientStore.view.workType : undefined}
                        options={props.clientStore.data.works.map((field, index) => {
                            return {
                                text: field.Title,
                                value: field.Title,
                                key: field.Id,
                            }
                        })}
                        style={{
                            maxWidth: "350px",
                            width: "auto",
                            margin: "20px 0px",
                        }}
                        placeHolder={props.clientStore.view.workType ? props.clientStore.view.workType : "select a Work"}
                        onChanged={e => {
                            props.clientStore.view.workId = e.key.toString()
                        }}
                        disabled={props.clientStore.view.asyncPendingLockout}
                    />
                )}

                <PrimaryButton
                    description="Submit Process Request"
                    onClick={props.clientStore.processClientRequest}
                    text="Submit Work Request"
                    disabled={props.clientStore.view.asyncPendingLockout}
                />
                <br />
                <br />

                <DefaultButton
                    text="Close"
                    description="close without submitting"
                    onClick={() => {
                        props.clientStore.view.showProcessModal = false
                    }}
                    disabled={props.clientStore.view.asyncPendingLockout}
                />
            </div>{" "}
        </Modal>
    )
})
export default observer(ProcessFormModal)