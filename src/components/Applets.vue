<template>
  <div class="applets">
    <h3 class="title">
      {{ version === 1 ? '小程序代码上传' : '小程序代码提交审核与生成小程序页面二维码' }}
    </h3>
    <transition-group tag="div" class="box" name="flip-list" mode="out-in">
      <div class="item" key="11">
        <fragment v-if="version === 1">
          <el-input
              placeholder="windows下请输入小程序cli的地址,一定要加上双引号"
              v-model="cli"
              clearable
              class="cli"
          />
          <el-input
              @change="setAllVersion"
              class="mutiple"
              clearable
              v-model="versionNumber"
              placeholder="同步版本号"
          />
        </fragment>
        <fragment v-else>
          <el-radio-group v-model="type">
            <el-radio :label="1">提交代码到审核</el-radio>
            <el-radio :label="2">审核通过代码提交上线</el-radio>
            <el-radio :label="3">生成小程序页面二维码</el-radio>
            <el-radio :label="4">生成小程序体验二维码</el-radio>
          </el-radio-group>
          <el-checkbox
              v-model="isBrowser"
              style="margin-left: 30px"
          >
            开启代码提交全过程(可选)
          </el-checkbox>
          <div class="input export">
            <input
                class="visible"
                type="file"
                ref="excel"
                @change="exportExcel"
            />
            <el-button
                round
                type="success"
            >
              导入excel
            </el-button>
          </div>
        </fragment>
      </div>
      <el-table
          @selection-change="handleSelectionChange"
          ref="table"
          key="table"
          :data="version === 1 ? file1 : file2"
      >
        <el-table-column
            fixed
            class-name="enterTo padLeft"
            type="selection"
            width="30"
        />
        <fragment v-if="version === 1">
          <el-table-column width="auto" label="全选">
            <template slot-scope="scope">
              <el-input
                  clearable
                  placeholder="小程序名称"
                  v-model="scope.row.appletsName"
              />
            </template>
          </el-table-column>
          <el-table-column width="auto">
            <template slot-scope="scope">
              <div class="input">
                <el-input
                    @click.native="selectPath(scope.$index,scope.row)"
                    placeholder="文件夹地址"
                    v-model="scope.row.path"
                />
              </div>
            </template>
          </el-table-column>
          <el-table-column width="auto">
            <template slot-scope="scope">
              <el-input
                  clearable
                  placeholder="版本号"
                  v-model="scope.row.version"
              />
            </template>
          </el-table-column>
          <el-table-column width="auto">
            <template slot-scope="scope">
              <el-input
                  clearable
                  placeholder="更新内容"
                  v-model="scope.row.info"
              />
            </template>
          </el-table-column>
        </fragment>
        <fragment v-else>
          <el-table-column width="auto" label="全选" class-name="enterTo">
            <template slot-scope="scope">
              <el-input
                  clearable
                  placeholder="微信公众平台用户名"
                  v-model="scope.row.user"
              />
            </template>
          </el-table-column>
          <el-table-column width="auto" class-name="enterTo">
            <template slot-scope="scope">
              <el-input
                  clearable
                  type="password"
                  show-password
                  placeholder="微信公众平台密码"
                  v-model="scope.row.pwd"
              />
            </template>
          </el-table-column>
          <el-table-column v-if="type === 3" width="auto" class-name="enterTo">
            <template slot-scope="scope">
              <el-input
                  clearable
                  placeholder="小程序任意页面路径"
                  v-model="scope.row.path"
              />
            </template>
          </el-table-column>
        </fragment>
        <el-table-column width="73" class-name="enterTo">
          <template slot-scope="scope">
            <el-button
                type="danger"
                icon="el-icon-plus"
                round
                v-if="scope.$index===0"
                @click="add"
            />
            <el-button
                type="danger"
                icon="el-icon-minus"
                round v-if="scope.$index!==0"
                @click.prevent="del(scope.$index)"
            />
          </template>
        </el-table-column>
      </el-table>
      <div class="btn-wrap" key="btn">
        <el-button
            type="danger"
            :loading="upload"
            key="10"
            @click="uploadCode"
        >
          提交代码
        </el-button>
        <el-button
            :disabled="upload"
            type="warning"
            key="12"
            @click="clearStore"
        >
          清除记录
        </el-button>
      </div>
    </transition-group>
    <div class="tips">
      <p class="total">
        {{ total }}
        <br>
        {{ complete }}
      </p>
      <p class="tips">
        {{ tips }}
        <img
            :src="img"
            alt=""
            class="img"
            v-if="img"
        >
      </p>
      <p class="error" v-if="error">
        {{ error }}
      </p>
    </div>
  </div>
</template>

<script>
import puppeteer from 'puppeteer-core'
import {remote, ipcRenderer} from 'electron'
import util from 'util'
import fs from 'fs'
import os from 'os'
import path from 'path'
import childProcess from 'child_process'
import xlsx from 'node-xlsx'
import img from '@/assets/1.gif'

const slash = os.platform() === 'darwin' ? '/' : '\\'

export default {
  name: "Applets",

  data() {
    return {
      multipleSelection1: [],
      multipleSelection2: [],
      file1: [],
      file2: [],
      upload: false,
      total: '',
      tips: '',
      error: '',
      type: 1,
      isBrowser: false,
      img: '',
      version: 1,
      cli: '',
      complete: '',
      versionNumber: ''
    }
  },

  methods: {
    /**
     * 使用内置chrome浏览器
     * @returns {string}
     * @private
     */
    _getDefaultOsPath() {
      if (process.platform === "win32") {
        return 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
      } else {
        return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      }
    },
    /**
     * 全选
     * @param val
     */
    handleSelectionChange(val) {
      this[`multipleSelection${this.version}`] = val
    },
    /**
     * 清除记录
     */
    clearStore() {
      if (this.version === 1) {
        this.multipleSelection1 = []
        this.file1 = [{
          appletsName: '',
          path: '',
          version: '',
          info: ''
        }]
        localStorage.removeItem('file1')
        localStorage.removeItem('cli')
      } else {
        this.multipleSelection2 = []
        this.file2 = [{
          user: '',
          pwd: ''
        }]
        localStorage.removeItem('file2')
      }
      this.clearStatus()
    },
    /**
     * 提交代码
     */
    uploadCode() {
      // 清空状态
      this.clearStatus()
      this.handleEmit().catch(err => {
        this.error = err
        this.upload = false
        if (this.version !== 1) {
          // 出错关闭 headless chrome .重新执行任务
          this.error = '由于网络原因导致出错，正在尝试重新从出错位置开始执行任务~！'
          this.closeBrowser(this.browser)
          this.multipleSelection2 = this.multipleSelection2.slice(this.index - 1)
          fs.unlinkSync(path.resolve(__dirname, '..', '..', `./${this.timeStamp}.png`))
          this.uploadCode()
        }
      })
    },
    /**
     * 处理操作流程
     * @returns {Promise<void>}
     */
    async handleEmit() {
      this.upload = true
      const version = this.version
      const selectItem = this[`multipleSelection${version}`]
      if (selectItem.length === 0) {
        this.$message({
          showClose: true,
          message: '请勾选需要执行的项~！🙂',
          type: 'error'
        })
        this.upload = false
        return
      }
      const exec = util.promisify(childProcess.exec)
      const promise = async (cli) => await exec(cli)
      if (version === 1) {
        const cli = this.cli ? this.cli : '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'
        const automationUpload = async (obj, i) => {
          if (i === 1) {
            this.timeStamp = Date.now()
          }
          this.tips = `当前${obj.appletsName}小程序的代码正在上传,已上传${i}个`
          // 上传代码
          await promise(`${cli} upload --project ${obj.path} -v ${obj.version} -d ${obj.info} `)

          this.tips = `当前${obj.appletsName}小程序的代码已上传完毕`

          if (selectItem.length === i) {
            this.tips = `所有小程序的代码均已上传完毕~!
           一共花费的时间为${(Date.now() - this.timeStamp) / 1000}s`
            this.upload = false
            localStorage.setItem('cli', this.cli)
            localStorage.setItem(`file${this.version}`, JSON.stringify(selectItem))
          }
        }
        const sequence = () => {
          this.total = `一共需要上传小程序数量为${selectItem.length}`
          return selectItem.reduce(async (prev, next, i) => {
            await prev
            return automationUpload(next, i + 1)
          }, Promise.resolve())
        }
        return sequence()
      } else {
        const browser = await puppeteer.launch({
          // 内置浏览器
          executablePath: this._getDefaultOsPath(),
          // 设置超时时间
          timeout: 60000,
          //如果是访问https页面 此属性会忽略https错误
          ignoreHTTPSErrors: true,
          // 打开开发者工具, 当此值为true时, headless总为false
          devtools: false,
          // 关闭headless模式, 不会打开浏览器
          headless: !this.isBrowser,
          // slowMo: 40
        })
        this.browser = browser
        // 打开一个新的标签页
        let page = await browser.newPage()
        // 指定进入微信登录模式
        const url = 'https://mp.weixin.qq.com'
        // 进入指定网址，networkidle0 参数将指定请求连接为0的时候才完成导航，也就是网页加载完毕。
        await page.goto(url, {waitUntil: 'networkidle0'})

        const automation = async (user, pwd, i) => {
          this.index = i
          await page.evaluate(() => {
            document.querySelector('.login__type__container__scan .login__type__container__select-type').click()
          })
          await page.type('input[name="account"]', user)
          await page.type('input[name="password"]', pwd)
          await page.click('.btn_login')
          if (!this.isBrowser) {
            // 此时将获取微信二维码
            await page.waitForSelector('.js_qrcode')
            await page.waitFor(1000)
            const imgEl = await page.$('.js_qrcode')
            this.timeStamp = Date.now()
            await imgEl.screenshot({
              path: path.resolve(__dirname, '..', '..', `./${this.timeStamp}.png`)
            })
            this.img = `file://${path.resolve(__dirname, '..', '..', `./${this.timeStamp}.png`)}`
            await page.waitForSelector('.js_wording') // 等待跳转后出现此class类
            const elTips = await page.$('.js_wording')
            this.tips = await elTips.evaluate(node => node.innerText)
          }
          await page.waitForSelector('#menuBar') // 等待扫码成功后，当前页面出现这个选择器后执行下一步。
          this.tips = '登录成功~！操作中...'
          // 将所有弹框全部隐藏
          await page.evaluate(() => {
            const mask = document.querySelectorAll('.weui-desktop-dialog_simple')
            mask.forEach(v => v.style.dispaly = 'none')
          })
          await page.goto(`${url}/wxamp/wacodepage/getcodepage?${page.url().split('?')[1]}`, {waitUntil: 'networkidle0'})
          if (this.type === 2) {
            // 此时将代码提交上线
            await page.click('.user_status .weui-desktop-popover__wrp')
            await page.evaluate(() => {
              const btn = document.querySelectorAll('.mr.weui-desktop-btn.weui-desktop-btn_primary')
              btn.forEach((el) => {
                if (el.textContent.includes('提交')) {
                  el.click()
                }
              })
            })
            await page.waitForSelector('.weui-desktop-qrcheck__img')
            await page.waitFor(1000)
            if (!this.isBrowser) {
              const imgEl = await page.$('.weui-desktop-qrcheck__img')
              fs.unlinkSync(path.resolve(__dirname, '..', '..', `./${this.timeStamp}.png`))
              this.timeStamp = Date.now()
              await imgEl.screenshot({
                path: path.resolve(__dirname, '..', '..', `./${this.timeStamp}.png`)
              })
              this.img = `file://${path.resolve(__dirname, '..', '..', `./${this.timeStamp}.png`)}`
              this.tips = '继续扫码确认发布代码~'
            }
            await page.waitForSelector('.empty_box')
          } else if (this.type === 1) {
            // 此时将代码提交审核(当不同人先后顺序上传代码后，这里应该以版本号做对比)
            const versionMaxIndex = await this.compareVersion(page)
            const el = await page.$$('.code_version_dev .code_version_log_ft')
            await el[versionMaxIndex].click()
            await page.waitFor(1000)
            // 有微信自己插件的情况下
            const wxPlugin = await page.$('[extclass="dialog_component"]  .weui-desktop-btn_primary')
            if (wxPlugin) {
              await wxPlugin.click('[extclass="dialog_component"]  .weui-desktop-btn_primary')
            }
            await page.waitForSelector('.weui-desktop-icon-checkbox')
            await page.waitFor(1000)
            await page.click('.weui-desktop-icon-checkbox')
            await page.click('.code_submit_dialog .weui-desktop-btn_primary')
            await page.click("[extclass='muti_msg_dialog'] .weui-desktop-btn_primary")
            await page.waitFor(2000)
            const pages = (await browser.pages())[2]
            const text = await pages.$('textarea')
            await text.evaluate(node => node.value = '')
            await pages.type('textarea', 'release update')
            await pages.click('.tool_bar')
            await pages.waitFor(1000)
            await pages.close()
          } else if (this.type === 3) {
            // 此时生成小程序任意页面二维
            await page.evaluate(() => {
              // 隐藏节点的click必须这么触发。page.click()无效
              document.querySelector('[data-msgid="生成小程序码"]').click()
            })
            await page.waitForNavigation()
            const userName = await page.$('.user_name')
            const nameTxt = await userName.evaluate(node => node.innerText)
            await page.type('input', nameTxt)
            await page.click('.weui-desktop-search__btn')
            await page.waitFor(1000)
            await page.click('.weui-desktop-btn_primary')
            await page.type('input', selectItem[i - 1].path)
            await page.click('.weui-desktop-btn_primary')
            await page.waitForSelector('.image-wrp')
            const ewm = await page.$('.image-wrp img')
            const desktop = `${os.homedir()}${slash}Desktop`
            const isDirectory = fs.existsSync(`${desktop}${slash}ewm`)
            if (!isDirectory) {
              await promise(`mkdir ${desktop}${slash}ewm`)
            }
            this.timeStamp = Date.now()
            await ewm.screenshot({
              path: `${desktop}${slash}ewm${slash}${this.timeStamp}.png`
            })
          } else if (this.type === 4) {
            // 生成体验版小程序二维码（以版本号为基准）
            const versionMaxIndex = await this.compareVersion(page)
            const el = await page.$$('.code_version_dev .code_version_log_ft .arrowBtn')
            await el[versionMaxIndex].click()
            await page.waitFor(1000)
            const elLi = await page.$('.weui-desktop-dropdown__list li:first-child')
            const txt = await elLi.evaluate(node => node.innerText)
            const bol = txt.includes('取消')
            if (bol) {
              await page.click('.status_tag.info')
            } else {
              await elLi.click()
              await page.waitFor(1000)
              await page.click('.server_url_dialog button.weui-desktop-btn_primary')
            }
            await page.waitForSelector('.pic_code_qrcode')
            const ewm = await page.$('.pic_code_qrcode')
            const desktop = `${os.homedir()}${slash}Desktop`
            const isDirectory = fs.existsSync(`${desktop}${slash}ewm`)
            if (!isDirectory) {
              await promise(`mkdir ${desktop}${slash}ewm`)
            }
            const userName = await page.$('.user_name')
            const name = await userName.evaluate(node => node.innerText)
            await ewm.screenshot({
              path: `${desktop}${slash}ewm${slash}${name}.png`
            })
          }

          await page.evaluate(() => {
            // 隐藏节点的click必须这么触发。page.click()无效
            document.querySelector('[data-msgid="退出"]').click()
          })
          // 等待当前账号退出后将新的页面实例重新赋予 page
          await page.waitForNavigation()
          page = (await browser.pages())[1]
          this.tips = `当前第${i}个小程序处理完成`
          this.complete = `已处理${i}个`
          if (!this.isBrowser && this.type !== 3) {
            fs.unlinkSync(path.resolve(__dirname, '..', '..', `./${this.timeStamp}.png`))
          }
          if (i === selectItem.length) {
            this.tips = `所有小程序均已处理完成`
            this.img = ''
            this.upload = false
            localStorage.setItem(`file${this.version}`, JSON.stringify(selectItem))
            // 关闭 headless chrome
            this.closeBrowser(browser)
          }
        }

        this.total = `一共有${selectItem.length}个小程序待处理`

        return selectItem.reduce(async (prev, next, i) => {
          await prev
          return automation(next.user, next.pwd, i + 1)
        }, Promise.resolve())
      }
    },
    /**
     * 删除
     * @param index
     */
    del(index) {
      const file = this[`file${this.version}`]
      const multipleSelection = this[`multipleSelection${this.version}`]
      file.splice(index, 1)
      multipleSelection.splice(index, 1)
    },
    /**
     * 添加
     */
    add() {
      if (this.version === 1) {
        this.file1.push({
          appletsName: '',
          path: '',
          version: '',
          info: '',
        })
      } else {
        this.file2.push({
          user: '',
          pwd: '',
          path: ''
        })
      }

    },
    /**
     * 弹出介绍
     */
    handleIntro() {
      this.$alert('<p>小程序代码上传： 能将本地多个小程序代码进行批量上传。</p>   ' +
          ' <p>小程序代码提交： 具有将上传后的代码进行批量提交审核和审核通过后的代码批量提交上线。</p>',
          '功能介绍', {
            dangerouslyUseHTMLString: true
          })
    },
    /**
     * 使用教程
     */
    handleTutorial() {
      this.$alert(`<img src="${img}"/>`,
          '使用教程', {
            customClass: 'gif',
            dangerouslyUseHTMLString: true
          })
    },
    /**
     * 切换工具版本
     */
    switchFun() {
      this.version = this.version === 1 ? 2 : 1
      this.clearStatus()
    },
    /**
     * 清空状态
     */
    clearStatus() {
      this.error = ''
      this.total = ''
      this.tips = ''
      this.img = ''
      this.complete = ''
    },
    /**
     * 选择路径
     * @param index
     * @param row
     */
    selectPath(index, row) {
      const {dialog} = require('electron').remote
      const {BrowserWindow} = require('electron').remote
      dialog.showOpenDialog(BrowserWindow.getFocusedWindow(), {
        properties: ['openDirectory', 'multiSelections']
      }).then((result) => {
        if (!result.canceled) {
          const arr = result.filePaths
          if (arr.length > 1) {
            // 批量选择文件夹
            this.file1 = []
            arr.forEach(v => {
              this.file1.push({
                path: v,
                appletsName: v.slice(v.lastIndexOf(slash) + 1),
                info: 'update code'
              })
            })
            return
          }
          row.path = arr[0]
          row.appletsName = arr[0].slice(arr[0].lastIndexOf(slash) + 1)
        }
      })
    },
    /**
     * 导入excel读取账号密码
     */
    exportExcel() {
      const el = this.$refs.excel
      const {path} = el.files[0]
      const sheets = xlsx.parse(path)[0].data
      const userIndex = sheets[0].findIndex((v) => v.includes('账号'))
      const pwdIndex = sheets[0].findIndex((v) => v.includes('密码'))
      sheets.shift(-1)
      this.file2 = sheets.map(v => {
        return {
          user: v[userIndex].replace(/\s+/g, ''),
          pwd: v[pwdIndex],
          path: ''
        }
      })
      el.value = ''
    },
    /**
     * 关闭浏览器
     */
    async closeBrowser(browser) {
      return await browser.close()
    },
    /**
     * 版本号作对比
     * @param page
     * @returns {Promise<Number>}
     */
    async compareVersion(page) {
      const versionEl = await page.$$('.code_version_dev .code_version_log_hd .simple_preview_value')
      let versionMaxIndex = 0
      if (versionEl.length > 0) {
        const version = versionEl.map(async (v, i) => {
          return {
            text: await v.evaluate((node) => node.innerText),
            index: i
          }
        })
        const result = await Promise.all(version)
        // 将版本号由大到小排序
        result.sort((a, b) => {
          if (a.text < b.text) {
            return 1
          }
          if (a.text > b.text) {
            return -1
          }
          return 0
        })
        versionMaxIndex = result[0].index
      }
      return versionMaxIndex
    },
    /**
     * 一键设置版本号
     */
    setAllVersion(val) {
      this.file1 = this.file1.map(v => {
        v.version = val
        return v
      })
    }
  },
  mounted() {
    this.file1 = JSON.parse(localStorage.getItem('file1')) || [
      {
        appletsName: '',
        path: '',
        version: '',
        info: ''
      },
      {
        appletsName: '',
        path: '',
        version: '',
        info: ''
      },
      {
        appletsName: '',
        path: '',
        version: '',
        info: ''
      }
    ]
    this.file2 = JSON.parse(localStorage.getItem('file2')) || [
      {
        user: '',
        pwd: '',
        path: ''
      },
      {
        user: '',
        pwd: '',
        path: ''
      },
      {
        user: '',
        pwd: '',
        path: ''
      },
      {
        user: '',
        pwd: '',
        path: ''
      }
    ]
    ipcRenderer.on('message', (event, type) => {
      switch (type) {
        case 'updating':
          this.$notify({
            type: 'info',
            message: '更新中',
            duration: 0
          })
          break
        case 'downloaded':
          this.$notify({
            type: 'success',
            message: '更新完成~即将重启'
          })
          break
        case 'switch':
          this.switchFun()
          break
        case 'intro':
          this.handleIntro()
          break
        case 'tutorial':
          this.handleTutorial()
          break
      }
    })
    const {Menu} = remote
    const createContextMenu = () => {
      const contextTemplate = [
        {
          label: "切换功能",
          click: () => {
            this.switchFun()
          }
        },
        {
          label: "查看教程",
          click: () => {
            this.handleTutorial()
          }
        },
        {
          label: "功能介绍",
          click: () => {
            this.handleIntro()
          }
        },
      ]
      return Menu.buildFromTemplate(contextTemplate)
    }
    window.addEventListener('contextmenu', (event) => {
      event.preventDefault()
      const contextMenu = createContextMenu()
      contextMenu.popup({
        window: remote.getCurrentWindow()
      })
    }, false)
    window.addEventListener('beforeunload', () => {
      if (this.version === 2) {
        // 这是为了防止程序意外终止但是headless chrome 依旧在后台运行。所以强制执行终止headless chrome
        this.closeBrowser(this.browser)
      }
    })
  }
}
</script>

<style lang="scss">
.applets {
  text-align: center;
  position: relative;
  margin: 0 auto;
  width: 90%;

  .title {
    font-size: 18px;
    padding: 20px 0;
    text-align: center;
  }

  .box {
    width: 100%;

    .el-input {
      width: 100%;
    }

    .cli {
      width: 100%;
    }
  }

  .el-table {
    background: transparent;

    th, tr, td {
      background: transparent;
      border-bottom: 0 !important;
    }

    .hover-row {
      td {
        background: transparent !important;
      }
    }

    &:before {
      height: 0;
    }

  }

  .padLeft {
    .cell {
      padding-left: 3px;
    }
  }

  .el-checkbox__inner {
    transform: scale(1.3);
  }

  .item {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .tips {
    padding: 10px 0 20px 0;
  }

  .status, .error {
    margin: 0 auto;
    text-align: left;
  }

  .img {
    display: block;
    width: 220px;
    height: 220px;
    margin: 20px auto 0;
  }

  .btn-wrap {
    margin-top: 30px;
  }

  .input {
    position: relative;

    .visible {
      opacity: 0;
      position: absolute;
      top: 0;
      width: 100%;
      height: 100%;
    }
  }

  .export {
    margin-left: 20px;
  }

  .mutiple {
    position: absolute;
    right: 30px;
    width: 15% !important;
  }
}
</style>
