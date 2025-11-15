import { InputBase, PasswordInput, Select, TextInput } from '@mantine/core'
import { DateInput } from '@mantine/dates'

export default {
    InputBase: InputBase.extend({
        defaultProps: {
            radius: 'md'
        }
    }),
    PasswordInput: PasswordInput.extend({
        defaultProps: {
            radius: 'md'
        }
    }),
    TextInput: TextInput.extend({
        defaultProps: {
            radius: 'md'
        }
    }),
    Select: Select.extend({
        defaultProps: {
            radius: 'md'
        }
    }),
    DateInput: DateInput.extend({
        defaultProps: {
            radius: 'md'
        }
    })
}

