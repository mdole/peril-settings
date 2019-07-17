jest.mock("danger", () => ({
  danger: {
    github: {
      utils: {
        fileContents: jest.fn(),
      },
      pr: {
        number: 12,
        body: "",
        base: {
          user: {
            login: "artsy",
          },
          repo: {
            name: "reaction",
          },
        },
      },
      api: {
        issues: {
          listLabelsForRepo: jest.fn(),
          createLabel: jest.fn(),
          addLabels: jest.fn(),
        },
      },
      issue: {
        labels: ["Merge on Green"],
      },
    },
  },
}))

import { danger } from "danger"

const mockGetLabels: jest.Mock = danger.github.api.issues.listLabelsForRepo as any
const mockCreateLabel: jest.Mock = danger.github.api.issues.createLabel as any
const mockAddLabels: jest.Mock = danger.github.api.issues.addLabels as any
const mockfileContents: jest.Mock = danger.github.utils.fileContents as any

import addPatchLabel, { labels } from "../org/addPatchLabel"

afterEach(() => {
  mockGetLabels.mockReset()
  mockCreateLabel.mockReset()
  mockAddLabels.mockReset()
  mockfileContents.mockReset()
})

it("Does nothing if there is no autorc", async () => {
  mockfileContents.mockResolvedValueOnce("")

  await addPatchLabel()

  expect(danger.github.api.issues.listLabelsForRepo).not.toBeCalled()
})

it("Does nothing if there's already a release label", async () => {
  danger.github.issue.labels = [{ name: "Version: Major" } as any]
  mockfileContents.mockResolvedValueOnce("{}")

  await addPatchLabel()

  expect(danger.github.api.issues.listLabelsForRepo).not.toBeCalled()
})

it("Creates labels for this repo if there are no labels yet", async () => {
  // nothing on the issue
  danger.github.issue.labels = []
  // nothing set up in the repo yet
  mockGetLabels.mockResolvedValueOnce({ data: [] })
  mockfileContents.mockResolvedValueOnce("{}")

  await addPatchLabel()

  // adds the labels to the repo
  expect(mockCreateLabel).toBeCalledTimes(Object.keys(labels).length)
  // and adds the default
  expect(mockAddLabels).toBeCalled()
})

it("Posts a patch label if there are no labels already added", async () => {
  // nothing on the issue
  danger.github.issue.labels = []
  // the repo already has labels set up
  mockGetLabels.mockResolvedValueOnce({ data: [{ name: "Version: Patch" } as any] })
  mockfileContents.mockResolvedValueOnce("{}")

  await addPatchLabel()

  expect(mockCreateLabel).not.toBeCalled()
  expect(mockAddLabels).toBeCalled()
})

it("Uses the docs label if the PR was created by netlify cms", async () => {
  danger.github.pr.body = "Automatically generated by Netlify CMS"

  // nothing on the issue
  danger.github.issue.labels = []
  // the repo already has labels set up
  mockGetLabels.mockResolvedValueOnce({ data: [{ name: "Version: Patch" } as any] })
  mockfileContents.mockResolvedValueOnce("{}")

  await addPatchLabel()

  expect(mockCreateLabel).not.toBeCalled()
  expect(mockAddLabels).toBeCalled()
  expect(mockAddLabels.mock.calls[0][0].labels).toEqual(["Docs"])
})

it("Uses the trivial label if it's a dependabot PR", async () => {
  danger.github.issue.labels = [{ name: "dependencies" } as any]
  mockGetLabels.mockResolvedValueOnce({
    data: [{ name: "Version: Patch" }, { name: "Version: Trivial" }],
  })
  mockfileContents.mockResolvedValueOnce("{}")

  await addPatchLabel()

  expect(mockCreateLabel).not.toBeCalled()
  expect(mockAddLabels).toBeCalled()
  expect(mockAddLabels.mock.calls[0][0].labels).toEqual(["Version: Trivial"])
})
