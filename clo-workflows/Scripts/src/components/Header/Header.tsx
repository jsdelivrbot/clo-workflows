import * as React from "react"
import { Persona, Toggle } from "office-ui-fabric-react/lib/"
import "./styles.scss"
import { IUser } from "../../model"

export interface IHeaderProps {
    currentUser: IUser
    clientMode?: boolean
    toggleClientMode?(): void
}

export const Header = (props: IHeaderProps) => {
    const { currentUser } = props
    return (
        <div className={"header-wrapper-styles"}>
            <div className={"header-title-styles"}>Licensing Task Tracker</div>
            <div className={"header-persona-styles"}>
                <Persona
                    size={4}
                    initialsColor="#0078d7"
                    text={currentUser.name}
                    secondaryText={`${currentUser.username} - ${currentUser.primaryRole.name}`}
                />
            </div>
            {props.toggleClientMode && (
                <div className={"header-toggle-styles"}>
                    <Toggle label="Client Mode" checked={props.clientMode} onClick={props.toggleClientMode} />
                </div>
            )}
        </div>
    )
}
