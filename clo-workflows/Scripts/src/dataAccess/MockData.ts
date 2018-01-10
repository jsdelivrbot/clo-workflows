import { IUserDto, IUser } from "../model/User"
import { ICloRequestElement } from "../model/CloRequestElement"

export const MockUsersDtos: Array<IUserDto> = [
    {
        name: "Connor Moody",
        email: "email@gmail.com",
        username: "cmoody",
        roleName: "Anonymous",
    },
    {
        name: "Connor Moody",
        email: "email@gmail.com",
        username: "cmoody",
        roleName: "Senior License Processor",
    },
]

export const MockUsers: Array<IUser> = [
    {
        name: "Connor Moody",
        email: "email@gmail.com",
        username: "cmoody",
        role: null,
    } ,
]

export const MockProjects: Array<ICloRequestElement> = [
    {
        type: "Theatrical",
        id: 1,
        title: "Test Theatrical Project",
        descriptionOfWork: "description...",
        artist: "artist name",
        copyrightOwner: "owner name",
    },
]

export const MockProcesses: Array<ICloRequestElement> = [
    {
        id: 1,
        step: "Public Domain Research",
        projectId: 1,
        workId: 1,
    },
    {
        id: 2,
        step: "Public Domain Research",
        projectId: 1,
        workId: 2,
    },
    {
        id: 3,
        step: "Ownership Research",
        projectId: 1,
        workId: 3,
    },
    {
        id: 4,
        step: "Payment",
        projectId: 1,
        workId: 4,
    },
]

export const MockWorks: Array<ICloRequestElement> = [
    {
        id: 1,
        type: "Music",
        title: "Song Name",
        artist: "Artist Name",
    },
    {
        id: 2,
        type: "Book",
        title: "Book Name",
        author: "Author Name",
    },
    {
        id: 3,
        type: "Article",
        title: "Article Name",
        author: "Author Name",
    },
    {
        id: 4,
        type: "Book Chapter",
        title: "Chapter Name",
        author: "Author Name",
    },
]
